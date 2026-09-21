import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LaunchProps, LaunchType } from "@raycast/api";
import AdjustVideoSpeed from "../adjust-video-speed";
import ChangeFramerate from "../change-framerate";
import RemoveAudio from "../remove-audio";
import { getSelectedFinderItems } from "@raycast/api";

import { ensureFfmpegAvailable } from "../utils/video-processor";

// Mock video processor
jest.mock("../utils/video-processor", () => ({
  ensureFfmpegAvailable: jest.fn(),
  VideoProcessor: jest.fn().mockImplementation(() => ({
    processVideo: jest.fn(),
  })),
}));

const mockGetSelectedFinderItems = getSelectedFinderItems as jest.MockedFunction<typeof getSelectedFinderItems>;

describe("AdjustVideoSpeed", () => {
  const mockProps: LaunchProps = {
    arguments: {},
    launchContext: {},
    launchType: LaunchType.UserInitiated,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(ensureFfmpegAvailable).mockResolvedValue(undefined);
  });

  it("should show no file selected message when no file is selected", async () => {
    mockGetSelectedFinderItems.mockResolvedValue([]);

    render(<AdjustVideoSpeed {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("No Video File Selected")).toBeInTheDocument();
    });
  });

  it("should show error for unsupported file format", async () => {
    mockGetSelectedFinderItems.mockResolvedValue([{ path: "/path/to/file.txt" }]);

    render(<AdjustVideoSpeed {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Unsupported file format/)).toBeInTheDocument();
    });
  });

  it("should show form when valid video file is selected", async () => {
    mockGetSelectedFinderItems.mockResolvedValue([{ path: "/path/to/video.mp4" }]);

    // Mock FFmpeg availability
    jest.mocked(ensureFfmpegAvailable).mockResolvedValue(undefined);

    render(<AdjustVideoSpeed {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("Selected File")).toBeInTheDocument();
      expect(screen.getByText("/path/to/video.mp4")).toBeInTheDocument();
      expect(screen.getByText("Speed Multiplier")).toBeInTheDocument();
    });
  });

  it("should show FFmpeg not found message when FFmpeg is unavailable", async () => {
    mockGetSelectedFinderItems.mockResolvedValue([{ path: "/path/to/video.mp4" }]);

    // Mock FFmpeg unavailability
    jest.mocked(ensureFfmpegAvailable).mockRejectedValue(new Error("Command not found"));

    render(<AdjustVideoSpeed {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText(/FFmpeg Not Found/)).toBeInTheDocument();
      expect(screen.getByText(/brew install ffmpeg/)).toBeInTheDocument();
    });
  });

  it("should update output path when speed changes", async () => {
    mockGetSelectedFinderItems.mockResolvedValue([{ path: "/path/to/video.mp4" }]);

    jest.mocked(ensureFfmpegAvailable).mockResolvedValue(undefined);

    render(<AdjustVideoSpeed {...mockProps} />);

    await waitFor(() => {
      const speedDropdown = screen.getByDisplayValue("2x (Double Speed)");
      expect(speedDropdown).toBeInTheDocument();
    });

    // Check that output path is updated
    const outputField = screen.getByDisplayValue("/path/to/video_x2_30fps.mp4");
    expect(outputField).toBeInTheDocument();
  });

  it("should handle form submission", async () => {
    mockGetSelectedFinderItems.mockResolvedValue([{ path: "/path/to/video.mp4" }]);

    jest.mocked(ensureFfmpegAvailable).mockResolvedValue(undefined);

    const { VideoProcessor } = require("../utils/video-processor");
    const mockProcessVideo = jest.fn().mockResolvedValue("/path/to/video_x2_30fps.mp4");
    VideoProcessor.mockImplementation(() => ({
      processVideo: mockProcessVideo,
    }));

    render(<AdjustVideoSpeed {...mockProps} />);

    await waitFor(() => {
      const submitButton = screen.getByText("Process Video");
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockProcessVideo).toHaveBeenCalledWith(
        "/path/to/video.mp4",
        "2",
        "30",
        "keep",
        "/path/to/video_x2_30fps.mp4"
      );
    });
  });

  it("should handle processing errors", async () => {
    mockGetSelectedFinderItems.mockResolvedValue([{ path: "/path/to/video.mp4" }]);

    jest.mocked(ensureFfmpegAvailable).mockResolvedValue(undefined);

    const { VideoProcessor } = require("../utils/video-processor");
    const mockProcessVideo = jest.fn().mockRejectedValue(new Error("Processing failed"));
    VideoProcessor.mockImplementation(() => ({
      processVideo: mockProcessVideo,
    }));

    render(<AdjustVideoSpeed {...mockProps} />);

    await waitFor(() => {
      const submitButton = screen.getByText("Process Video");
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Processing failed")).toBeInTheDocument();
    });
  });
});

it("uses the file path argument without reading Finder", async () => {
  jest.mocked(ensureFfmpegAvailable).mockResolvedValue(undefined);
  mockGetSelectedFinderItems.mockClear();
  render(<AdjustVideoSpeed arguments={{ filePath: "/path/to/argument.mov" }} launchType={LaunchType.UserInitiated} />);
  await waitFor(() => expect(screen.getByText("/path/to/argument.mov")).toBeInTheDocument());
  expect(mockGetSelectedFinderItems).not.toHaveBeenCalled();
});

it.each([
  [AdjustVideoSpeed, "Process Video", "2", "keep"],
  [ChangeFramerate, "Process Video (Change Framerate)", "1", "keep"],
  [RemoveAudio, "Process Video (Remove Audio)", "2", "remove"],
] as const)("submits the edited output path for %p", async (Command, action, speed, audio) => {
  jest.mocked(ensureFfmpegAvailable).mockResolvedValue(undefined);
  const { VideoProcessor } = require("../utils/video-processor");
  const processVideo = jest.fn().mockResolvedValue("/path/to/custom.mp4");
  VideoProcessor.mockImplementation(() => ({ processVideo }));
  render(<Command arguments={{ filePath: "/path/to/source.mp4" }} launchType={LaunchType.UserInitiated} />);
  await waitFor(() => expect(screen.getByPlaceholderText("Output file path")).toBeInTheDocument());
  fireEvent.change(screen.getByPlaceholderText("Output file path"), {
    target: { value: "/path/to/custom.mp4" },
  });
  fireEvent.click(screen.getByText(action));
  await waitFor(() =>
    expect(processVideo).toHaveBeenCalledWith("/path/to/source.mp4", speed, "30", audio, "/path/to/custom.mp4")
  );
});

// Finder may have no selection or reject when its frontmost window is unavailable.
describe.each([AdjustVideoSpeed, ChangeFramerate, RemoveAudio])("%p file reselection", (Command) => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSelectedFinderItems.mockReset();
    jest.mocked(ensureFfmpegAvailable).mockResolvedValue(undefined);
  });

  it.each(["empty", "unavailable"] as const)("clears the previous file when Finder is %s", async (result) => {
    render(<Command arguments={{ filePath: "/path/to/previous.mp4" }} launchType={LaunchType.UserInitiated} />);
    await screen.findByText("/path/to/previous.mp4");
    if (result === "empty") mockGetSelectedFinderItems.mockResolvedValue([]);
    else mockGetSelectedFinderItems.mockRejectedValue(new Error("Finder unavailable"));

    fireEvent.click(screen.getByText("Select Different File"));

    await screen.findByText("No Video File Selected");
    expect(screen.queryByText("/path/to/previous.mp4")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Output file path")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Process Video/)).not.toBeInTheDocument();
  });

  it("clears the previous file while a replacement selection is pending", async () => {
    render(<Command arguments={{ filePath: "/path/to/previous.mp4" }} launchType={LaunchType.UserInitiated} />);
    await screen.findByText("/path/to/previous.mp4");
    let finishSelection!: (items: { path: string }[]) => void;
    mockGetSelectedFinderItems.mockReturnValue(
      new Promise((resolve) => {
        finishSelection = resolve;
      })
    );
    fireEvent.click(screen.getByText("Select Different File"));
    expect(screen.queryByText(/^Process Video/)).not.toBeInTheDocument();
    finishSelection([{ path: "/path/to/replacement.mp4" }]);
    await screen.findByText("/path/to/replacement.mp4");
    expect((screen.getByPlaceholderText("Output file path") as HTMLInputElement).value).toContain(
      "/path/to/replacement"
    );
  });

  it("keeps the output filename consistent with the current options after reselection", async () => {
    render(<Command arguments={{ filePath: "/path/to/previous.mp4" }} launchType={LaunchType.UserInitiated} />);
    await screen.findByText("/path/to/previous.mp4");
    const speedDropdown = screen.getByRole("option", { name: "4x (Audio Resampled)" }).closest("select")!;
    fireEvent.change(speedDropdown, { target: { value: "4" } });
    mockGetSelectedFinderItems.mockResolvedValue([{ path: "/path/to/replacement.mp4" }]);
    fireEvent.click(screen.getByText("Select Different File"));
    await screen.findByText("/path/to/replacement.mp4");
    expect((screen.getByPlaceholderText("Output file path") as HTMLInputElement).value).toContain("_x4_30fps");
  });
});
