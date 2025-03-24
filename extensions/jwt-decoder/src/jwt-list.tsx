import { List } from "@raycast/api";
import { useState } from "react";
import * as jose from "jose";
import { renderToString } from "react-dom/server";
import { ListFromObject } from "./utils/list-from-object";
import { TokenSvg } from "./components/token-svg";
import { JwtListItem } from "./components/jwt-list-item";
import { useClipboard, usePreferences } from "raycast-hooks";
import { ErrorDetail } from "./components/error-detail";
import { PleaseCopy } from "./components/please-copy";
import useClaims from "./utils/use-claims";

interface selectedState {
  type: string;
  value: string;
}

const JwtView = () => {
  const { ready, clipboard } = useClipboard();
  const [{ showDetail }, { update }] = usePreferences({ showDetail: false });
  const [selected, setSelected] = useState<selectedState>();
  const claims = useClaims();

  if (ready === false || clipboard === undefined || clipboard.length === 0) {
    return <PleaseCopy ready={ready} />;
  }

  try {
    const header = jose.decodeProtectedHeader(clipboard);
    const data = jose.decodeJwt(clipboard);
    const headerItems = ListFromObject(header, claims);
    const dataItems = ListFromObject(data, claims);

    const section = selected?.type;
    const definition = (selected?.type === "head" ? headerItems : dataItems).find(
      (item) => item.key === selected?.value
    );

    const markdown = showDetail
      ? [
          `<img alt="view token" width="400" src="data:image/svg+xml,${encodeURIComponent(
            renderToString(
              <TokenSvg
                {...{
                  clipboard,
                  showToken: true,
                  showLogo: false,
                  showDetail: false,
                  section,
                  definition,
                }}
              />
            )
          )}" />`,
        ]
      : [];

    const detail = !!showDetail && <List.Item.Detail markdown={markdown.join("\n\n")} />;

    const selectionChange = (id?: string | null) => {
      const parts = id ? id.split(".") : [];
      setSelected({ type: parts[0] ?? "", value: parts[1] ?? "" });
    };
    return (
      <List isLoading={!ready} isShowingDetail={!!showDetail} onSelectionChange={selectionChange}>
        <List.Section title="HEAD: ALGORITHM & TOKEN TYPE">
          {headerItems.map((item) => (
            <JwtListItem
              key={item.key}
              type="head"
              {...{
                item,
                detail,
                data,
                header,
              }}
              showDetail={!!showDetail}
              toggleShowDetail={() => update("showDetail", !showDetail)}
            />
          ))}
        </List.Section>
        <List.Section title="PAYLOAD: DATA">
          {dataItems.map((item) => (
            <JwtListItem
              key={item.key}
              type="data"
              {...{
                item,
                detail,
                data,
                header,
              }}
              showDetail={!!showDetail}
              toggleShowDetail={() => update("showDetail", !showDetail)}
            />
          ))}
        </List.Section>
      </List>
    );
  } catch (error) {
    return <ErrorDetail error={error} value={clipboard} />;
  }
};

export default JwtView;
