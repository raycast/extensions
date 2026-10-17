import { showToast, Toast } from "@raycast/api";
import MusicAssistantClient from "../../src/music-assistant/music-assistant-client";
import { MediaType } from "../../src/music-assistant/external-code/interfaces";
import { addItemToQueueNext } from "../../src/music-library-hub/actions";
import { getSelectedQueueID } from "../../src/player-selection/use-selected-player-id";

jest.mock("@raycast/api");
jest.mock("../../src/player-selection/use-selected-player-id");

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const mockGetSelectedQueueID = getSelectedQueueID as jest.MockedFunction<typeof getSelectedQueueID>;

function createItem() {
  return {
    item_id: "track-1",
    media_type: MediaType.TRACK,
    name: "Test Track",
    uri: "library://track/track-1",
  } as const;
}

describe("music-library-hub/actions", () => {
  let mockClient: jest.Mocked<MusicAssistantClient>;

  beforeEach(() => {
    mockClient = {
      addToQueueNext: jest.fn(),
      formatAddToQueueNextMessage: jest.fn(),
    } as unknown as jest.Mocked<MusicAssistantClient>;
    mockShowToast.mockResolvedValue({ style: Toast.Style.Success, title: "ok" } as Toast);
  });

  it("returns early when no queue is selected", async () => {
    mockGetSelectedQueueID.mockResolvedValue(undefined);

    await addItemToQueueNext(mockClient, createItem(), "Test Track");

    expect(mockClient.addToQueueNext).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("adds item, shows success toast, and executes success callback", async () => {
    const onSuccess = jest.fn();
    mockGetSelectedQueueID.mockResolvedValue("queue-123");
    mockClient.addToQueueNext.mockResolvedValue(undefined);
    mockClient.formatAddToQueueNextMessage.mockReturnValue('"Test Track" will play next');

    await addItemToQueueNext(mockClient, createItem(), "Test Track", onSuccess);

    expect(mockClient.addToQueueNext).toHaveBeenCalledWith(createItem(), "queue-123");
    expect(mockShowToast).toHaveBeenCalledWith({
      style: Toast.Style.Success,
      title: "Added to Queue",
      message: '"Test Track" will play next',
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("shows failure toast when queue add fails", async () => {
    mockGetSelectedQueueID.mockResolvedValue("queue-123");
    mockClient.addToQueueNext.mockRejectedValue(new Error("queue add failed"));

    await addItemToQueueNext(mockClient, createItem(), "Test Track");

    expect(mockShowToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Failed to Add to Queue",
      message: "queue add failed",
    });
  });
});
