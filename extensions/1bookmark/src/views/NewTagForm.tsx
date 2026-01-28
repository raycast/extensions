import { CachedQueryClientProvider } from "@/components/CachedQueryClientProvider";
import { useState } from "react";
import { trpc } from "@/utils/trpc.util";
import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { useMe } from "../hooks/use-me.hook";

function Body(props: { spaceId: string }) {
  const { spaceId } = props;
  const [selectedSpaceId, setSelectedSpaceId] = useState(spaceId);
  const me = useMe();

  const { pop } = useNavigation();
  const create = trpc.tag.create.useMutation();
  const [tag, setTag] = useState("");

  function handleSubmit() {
    create.mutate(
      { spaceId: selectedSpaceId, name: tag },
      {
        onSuccess: () => {
          showToast({
            style: Toast.Style.Success,
            title: "Created tag",
          });
          pop();
        },
      },
    );
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
