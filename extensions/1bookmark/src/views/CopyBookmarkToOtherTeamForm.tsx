import { CachedQueryClientProvider } from "@/components/CachedQueryClientProvider";
import { Bookmark } from "@/types";
import { trpc } from "@/utils/trpc.util";
import { Form, Icon } from "@raycast/api";
import { useRef } from "react";

type Props = {
  bookmark: Bookmark;
};

const Body = ({ bookmark }: Props) => {
  const { data: userInfo } = trpc.user.me.useQuery();

  const textAreaRef = useRef<Form.TextArea>(null);
  const tagPickerRef = useRef<Form.TagPicker>(null);

  return (
    <Form>
      <Form.TextArea
        id="textArea"
        title="TextArea"
        ref={textAreaRef}
        placeholder="Enter the Space name to copy the bookmark to."
        value={[
          "## My Space",
          "",
          JSON.stringify(userInfo, null, 2),
          "",
          "## Bookmark Info",
          "",
          JSON.stringify(bookmark, null, 2),
          "",
        ].join("\n")}
      />
      <Form.TagPicker id="tagPicker" title="TagPicker" ref={tagPickerRef}>
        <Form.TagPicker.Item
          key={userInfo?.email}
          value={userInfo?.email || ""}
          title={"Copy to My Bookmark"}
          icon={userInfo?.image || Icon.Person}
        />
        {userInfo?.associatedSpaces.map((space) => (
          <Form.TagPicker.Item key={space.id} value={space.id} title={space.name} icon={space.image || Icon.Person} />
        ))}
      </Form.TagPicker>
    </Form>
  );
};

export const CopyBookmarkToOtherSpace = ({ bookmark }: Props) => {
  return (
    <CachedQueryClientProvider>
      <Body bookmark={bookmark} />
    </CachedQueryClientProvider>
  );
};
