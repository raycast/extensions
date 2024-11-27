import { Action, ActionPanel, Alert, confirmAlert, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { ListItemDetailSection } from "./components/detailSection";
import { HeadersListItemDetails } from "./components/headersDetails";
import { useStorage } from "./hooks/storage";
import { Rebound, ReboundRequestMethod, ReboundRequestProtocol, Rebounds } from "./types/rebound";
import { StorageKey } from "./types/storage";
import { useReboundsHelpersFactory } from "./utils/rebound";
import { isJson } from "./utils/storage";
import { CreateRebound } from "./views/createRebound";
import { EditRebound } from "./views/editRebound";
import { ReboundView } from "./views/rebound";

const EXAMPLE_REBOUNDS: Rebounds = {
  "1": {
    id: "1",
    favorite: false,

    url: new URL("https://api.myip.com"),
    details: {
      method: ReboundRequestMethod.GET,
      protocol: ReboundRequestProtocol.HTTPS,
      hostname: "api.myip.com",
      path: "/",
      headers: {
        Authorization: "Bearer ...",
      },
      body: JSON.stringify({
        something: "something",
      }),
    },
    responses: [
      {
        status: {
          code: 200,
          message: "OK",
        },
        body: JSON.stringify({
          "some-key": "some-value",
          "integer-key": 123,
          "array-key": ["a", "b", "c"],
          "object-key": {
            "nested-key": "nested-value",
          },
        }),
        headers: {
          "Content-Type": "application/json",
        },
        created: new Date(),
      },
    ],

    created: new Date(),
  },
};

export default function ReboundCommand() {
  const {
    value: rebounds,
    setValue: setRebounds,
    removeValue: clearRebounds,
    refetch: refetchRebounds,
  } = useStorage<Rebounds>(StorageKey.REBOUNDS, {});

  const reboundHelpersFactory = useReboundsHelpersFactory({
    rebounds,
    setRebounds,
  });

  const favorites: Rebounds = useMemo(
    () => Object.fromEntries(Object.entries(rebounds).filter(([, rebound]) => rebound.favorite)),
    [rebounds],
  );

  function renderRebound(rebound: Rebound) {
    const { favoriteRebound, unfavoriteRebound, tocURL } = reboundHelpersFactory(rebound);

    let actualBody: string | undefined;
    if (rebound.details.body && rebound.details.body !== "") {
      if (isJson(rebound.details.body)) {
        actualBody = `\`\`\`json\n${JSON.stringify(JSON.parse(rebound.details.body), null, 2)}\n\`\`\``;
      } else {
        actualBody = `\`\`\`\n${rebound.details.body}\n\`\`\``;
      }
    }

    const details = (
      <List.Item.Detail
        markdown={actualBody}
        metadata={
          <List.Item.Detail.Metadata>
            <ListItemDetailSection noSeparator>
              <List.Item.Detail.Metadata.TagList title="Method">
                <List.Item.Detail.Metadata.TagList.Item icon={Icon.Hashtag} text={rebound.details.method} />
              </List.Item.Detail.Metadata.TagList>
            </ListItemDetailSection>
            <ListItemDetailSection title="Headers">
              <HeadersListItemDetails headers={rebound.details.headers ?? {}} />
            </ListItemDetailSection>
          </List.Item.Detail.Metadata>
        }
      />
    );

    return (
      <List.Item
        key={rebound.id}
        title={rebound.url.toString()}
        detail={details}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Rebound"
              icon={Icon.Ellipsis}
              target={<ReboundView reboundId={rebound.id} rebounds={rebounds} setRebounds={setRebounds} />}
            />
            <Action.Push
              title="Create New Rebound"
              icon={Icon.Plus}
              target={<CreateRebound rebounds={rebounds} setRebounds={setRebounds} />}
              onPop={refetchRebounds}
            />
            <Action.Push
              title="Edit Rebound"
              icon={Icon.Pencil}
              target={<EditRebound rebounds={rebounds} setRebounds={setRebounds} rebound={rebound} />}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action
              title={`${rebound.favorite ? "Unfavorite" : "Favorite"} Rebound`}
              icon={rebound.favorite ? Icon.StarDisabled : Icon.Star}
              onAction={rebound.favorite ? unfavoriteRebound : favoriteRebound}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            {/* eslint-disable-next-line @raycast/prefer-title-case */}
            <Action.CopyToClipboard title="Copy cURL" content={tocURL()} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            <ActionPanel.Section title="Danger Zone">
              <Action
                title="Delete Rebound"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                onAction={async () => {
                  if (
                    !(await confirmAlert({
                      title: "Are you sure?",
                      message: "Do you really want to delete this Rebound? This action is irreversible.",
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                      },
                    }))
                  ) {
                    return;
                  }

                  setRebounds((previous) => {
                    const updatedRebounds = { ...previous };
                    delete updatedRebounds[rebound.id];
                    return updatedRebounds;
                  });
                }}
              />
              <Action
                title="Delete All Rebounds"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => {
                  clearRebounds().then();
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  function renderRebounds(reboundsToRender: Rebounds) {
    return Object.values(reboundsToRender).map((rebound) => renderRebound(rebound));
  }

  return (
    <List isShowingDetail={Object.keys(rebounds).length > 0}>
      <List.EmptyView
        title="No Rebounds Yet"
        description="Please create some Rebounds first"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Rebound"
              target={<CreateRebound rebounds={rebounds} setRebounds={setRebounds} />}
            />
            <Action
              title="Load Exmaple"
              onAction={() => {
                setRebounds(EXAMPLE_REBOUNDS);
              }}
            />
          </ActionPanel>
        }
      />
      {Object.keys(favorites).length > 0 && <List.Section title="Favorites">{renderRebounds(favorites)}</List.Section>}
      <List.Section title="Rebounds">{renderRebounds(rebounds)}</List.Section>
    </List>
  );
}
