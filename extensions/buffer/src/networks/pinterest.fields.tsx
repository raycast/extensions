import { Form } from "@raycast/api";
import type { PinterestBoard } from "../api/types";

export function PinterestFields({
  boards,
  boardsLoading,
}: {
  boards: PinterestBoard[] | undefined;
  boardsLoading: boolean;
}) {
  return (
    <>
      <Form.Separator />
      <Form.Dropdown
        id="pinterestBoardId"
        title="Pinterest Board"
        isLoading={boardsLoading}
      >
        {boards?.map((board) => (
          <Form.Dropdown.Item
            key={board.serviceId}
            value={board.serviceId}
            title={board.name}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="pinterestTitle"
        title="Pinterest Title"
        placeholder="The title of the Pin (optional)"
      />
      <Form.TextField
        id="pinterestUrl"
        title="Pinterest Destination URL"
        placeholder="https://example.com (optional)"
      />
    </>
  );
}
