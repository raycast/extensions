import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LaunchProps } from '@raycast/api';
import AdjustVideoSpeed from '../adjust-video-speed';
import { getSelectedFinderItems } from '@raycast/api';

// Mock video processor
jest.mock('../utils/video-processor', () => ({
  VideoProcessor: jest.fn().mockImplementation(() => ({
    processVideo: jest.fn(),
  })),
}));

// Mock child_process
jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

const mockGetSelectedFinderItems =
  getSelectedFinderItems as jest.MockedFunction<typeof getSelectedFinderItems>;

describe('AdjustVideoSpeed', () => {
  const mockProps: LaunchProps = {
    arguments: {},
    launchContext: {},
    launchType: 'userInitiated' as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show no file selected message when no file is selected', async () => {
    mockGetSelectedFinderItems.mockResolvedValue([]);

    render(<AdjustVideoSpeed {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('No Video File Selected')).toBeInTheDocument();
    });
  });

  it('should show error for unsupported file format', async () => {
    mockGetSelectedFinderItems.mockResolvedValue([
      { path: '/path/to/file.txt' },
    ]);

    render(<AdjustVideoSpeed {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Unsupported file format/)).toBeInTheDocument();
    });
  });

  it('should show form when valid video file is selected', async () => {
    mockGetSelectedFinderItems.mockResolvedValue([
      { path: '/path/to/video.mp4' },
    ]);

    // Mock FFmpeg availability
    const { execFile } = require('child_process');
    execFile.mockResolvedValue({ stdout: 'ffmpeg version 4.4.0' });

    render(<AdjustVideoSpeed {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Selected File')).toBeInTheDocument();
      expect(screen.getByText('/path/to/video.mp4')).toBeInTheDocument();
      expect(screen.getByText('Speed Multiplier')).toBeInTheDocument();
    });
  });

  it('should show FFmpeg not found message when FFmpeg is unavailable', async () => {
    mockGetSelectedFinderItems.mockResolvedValue([
      { path: '/path/to/video.mp4' },
    ]);

    // Mock FFmpeg unavailability
    const { execFile } = require('child_process');
    execFile.mockRejectedValue(new Error('Command not found'));

    render(<AdjustVideoSpeed {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('FFmpeg Not Found')).toBeInTheDocument();
      expect(screen.getByText(/brew install ffmpeg/)).toBeInTheDocument();
    });
  });

  it('should update output path when speed changes', async () => {
    mockGetSelectedFinderItems.mockResolvedValue([
      { path: '/path/to/video.mp4' },
    ]);

    const { execFile } = require('child_process');
    execFile.mockResolvedValue({ stdout: 'ffmpeg version 4.4.0' });

    render(<AdjustVideoSpeed {...mockProps} />);

    await waitFor(() => {
      const speedDropdown = screen.getByDisplayValue('2x (Double Speed)');
      expect(speedDropdown).toBeInTheDocument();
    });

    // Check that output path is updated
    const outputField = screen.getByDisplayValue('/path/to/video_x2.mp4');
    expect(outputField).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    mockGetSelectedFinderItems.mockResolvedValue([
      { path: '/path/to/video.mp4' },
    ]);

    const { execFile } = require('child_process');
    execFile.mockResolvedValue({ stdout: 'ffmpeg version 4.4.0' });

    const { VideoProcessor } = require('../utils/video-processor');
    const mockProcessVideo = jest
      .fn()
      .mockResolvedValue('/path/to/video_x2.mp4');
    VideoProcessor.mockImplementation(() => ({
      processVideo: mockProcessVideo,
    }));

    render(<AdjustVideoSpeed {...mockProps} />);

    await waitFor(() => {
      const submitButton = screen.getByText('Process Video');
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockProcessVideo).toHaveBeenCalledWith('/path/to/video.mp4', '2');
    });
  });

  it('should handle processing errors', async () => {
    mockGetSelectedFinderItems.mockResolvedValue([
      { path: '/path/to/video.mp4' },
    ]);

    const { execFile } = require('child_process');
    execFile.mockResolvedValue({ stdout: 'ffmpeg version 4.4.0' });

    const { VideoProcessor } = require('../utils/video-processor');
    const mockProcessVideo = jest
      .fn()
      .mockRejectedValue(new Error('Processing failed'));
    VideoProcessor.mockImplementation(() => ({
      processVideo: mockProcessVideo,
    }));

    render(<AdjustVideoSpeed {...mockProps} />);

    await waitFor(() => {
      const submitButton = screen.getByText('Process Video');
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Processing failed')).toBeInTheDocument();
    });
  });
});
