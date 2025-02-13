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
        placeholder="여기에 북마크 복사할 팀 이름을 적으세요."
        value={[
          "## 내가 속한 팀",
          "",
          JSON.stringify(userInfo, null, 2),
          "",
          "## Bookmark 정보",
          "",
          JSON.stringify(bookmark, null, 2),
          "",
        ].join("\n")}
      />
      <Form.TagPicker
        id="tagPicker"
        title="TagPicker"
        ref={tagPickerRef}
        onChange={(t) => {
          console.log("🔍 t", t);
        }}
      >
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

export const CopyBookmarkToOtherTeam = ({ bookmark }: Props) => {
  return (
    <CachedQueryClientProvider>
      <Body bookmark={bookmark} />
    </CachedQueryClientProvider>
  );
};
