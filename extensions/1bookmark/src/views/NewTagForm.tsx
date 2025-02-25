import { CachedQueryClientProvider } from "@/components/CachedQueryClientProvider";
import { useState } from "react";
import { useAtom } from "jotai";
import { trpc } from "@/utils/trpc.util";
import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { useMe } from "../hooks/use-me.hook";
import { sessionTokenAtom } from "../states/session-token.state";

function Body(props: { spaceId: string }) {
  const { spaceId } = props;
  const [selectedSpaceId, setSelectedSpaceId] = useState(spaceId);
  const [sessionToken] = useAtom(sessionTokenAtom);
  const me = useMe(sessionToken);

  const { pop } = useNavigation();
  const create = trpc.tag.create.useMutation();
  const [tag, setTag] = useState("");

  async function handleSubmit() {
    try {
      await create.mutateAsync({ spaceId: selectedSpaceId, name: tag });
      showToast({
        style: Toast.Style.Success,
        title: "Created tag",
      });
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create tag",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Tag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="space"
        title="Space"
        defaultValue={spaceId}
        onChange={(value) => {
          setSelectedSpaceId(value);
        }}
      >
        {me.data?.associatedSpaces.map((s) => (
          <Form.Dropdown.Item key={s.id} value={s.id} title={s.name} icon={s.image || Icon.TwoPeople} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="tagName"
        title="Tag Name"
        autoFocus
        // ref={textAeaRef}
        value={tag}
        onChange={(value) => setTag(value)}
      />
    </Form>
  );
}

export const NewTagForm = (props: { spaceId: string }) => {
  const { spaceId } = props;
  return (
    <CachedQueryClientProvider>
      <Body spaceId={spaceId} />
    </CachedQueryClientProvider>
  );
};
