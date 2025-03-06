
--- Repository Documentation ---

```markdown
# Nest Camera Viewer Raycast Extension

## Repository Purpose and Summary

This repository contains the source code for the "Nest Camera Viewer" Raycast extension.  The extension allows users to quickly view their Google Nest camera feeds (specifically Nest Cam Indoor 1st generation) directly within Raycast using RTSP streaming. It leverages FFplay for efficient, low-latency video playback.  It handles authentication, camera discovery, stream initiation, and process management.

## Quick Start

### Installation

1.  **Install FFmpeg/FFplay:** This is **required** for video playback.  Use Homebrew:
    ```bash
    brew install ffmpeg
    ```
    If you don't have Homebrew, install it first:
    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```
    Then install ffmpeg.
2.  **Install the extension:** Install the "Nest Camera Viewer" extension from the Raycast Store.
3. **Google Device Access Registration:**
      - Visit [Google Device Access Console](https://console.nest.google.com/device-access)
      - Complete registration (requires a $5 one-time fee).
      - Create a project within the Device Access Console and note the **Project ID**.
4.  **Configure OAuth2:**
    -   Visit [Google Cloud Console](https://console.cloud.google.com).
    -   Create a new project (or use the same one from Device Access registration, **Important:** Ensure that this project has Smart Device Management API enabled).
    -   Navigate to **APIs & Services** -> **Credentials**.
    -   Create **OAuth 2.0 Client IDs** credentials (of type "Web application").
    -   Add the following authorized redirect URI:  `https://oauth.raycast.com/google`
    -   Note the **Client ID** and **Client Secret**.
5.  **Configure Extension Preferences:**
    -   Open Raycast.
    -   Type `nestcamera` to find and select the "View Nest Cameras" command.  The extension handles configuration errors and will guide you to open preferences if they are incorrect.
    -   Go to the extension's preferences (⌘+, or type "Preferences" in Raycast, then navigate to Extensions -> Nest Camera).
    -   Enter your **Google Project ID**, **OAuth Client ID**, and **OAuth Client Secret** from steps 3 and 4.

### Basic Usage

1.  Open Raycast.
2.  Type `nestcamera` and select "View Nest Cameras".
3.  Select a camera from the list.
4.  Press Enter to start streaming.  The stream will open in an FFplay window.  This may take 10-20 seconds. A loading dialog will be displayed.
5. To stop the stream, close the FFplay window (Command+Q).

## Configuration Options

The extension requires the following configuration options, set in Raycast's extension preferences:

*   **Project ID:** Your Google Device Access project ID (obtained from the [Device Access Console](https://console.nest.google.com/device-access)).
*   **Client ID:** Your Google OAuth 2.0 Client ID (obtained from the [Google Cloud Console](https://console.cloud.google.com)).  Should end with `.apps.googleusercontent.com`.
*   **Client Secret:** Your Google OAuth 2.0 Client Secret (obtained from the [Google Cloud Console](https://console.cloud.google.com)). Should start with `GOCSPX-`.

The extension validates these settings and will display an error message if any are missing or invalid.  It provides links to the relevant Google Cloud Console pages in the error messages to ease configuration.

## Package Summaries and Documentation

This repository consists of a single Raycast extension.  Therefore, there are not multiple packages. We proceed with documenting the extension's public features and APIs.

### Installation / Import

The extension is installed via the Raycast Store. Once installed, the commands `View Nest Cameras`, `Quick Access Camera` and `Reset Oauth Credentials` are available within Raycast. There is no import in the traditional programming sense, but the functionality is used through the main command, which manages authentication automatically via Raycast's OAuth support.

### Public Features / API / Interface

The extension's primary public interfaces are its Raycast commands:

*   **`View Nest Cameras` (index.tsx):** This is the main command.
    *   **Purpose:**  Displays a list of available Nest cameras (1st gen Indoor) and allows the user to start streaming from a selected camera.
    *   **Authentication:**  Handles Google OAuth 2.0 authentication.  If the user is not authenticated or tokens are expired, it initiates the Raycast OAuth flow.
    *   **Camera Discovery:**  Fetches the list of cameras using the `NestDeviceService`.
    *   **Streaming:**  Initiates RTSP streaming through the `RtspStreamService` and `ProcessManager`, which spawns an FFplay process.
    *   **UI:** Uses `CameraList`, `CameraListItem` and `CameraView` components to display camera information and actions.
    *   **Quick Access:** Allows setting a camera as "Quick Access" for faster launching.
    *   **Error Handling:** Displays toasts for various errors (authentication, network, stream failures).
    *   **Preferences:** Relies on preferences (Project ID, Client ID, Client Secret) for API access.
*   **`Quick Access Camera` (quick-access.tsx):**
    *   **Purpose:**  Immediately starts streaming the user's designated "Quick Access" camera, if one is set.
    *   **Dependencies:** Uses `QuickAccessService` to retrieve the quick access camera ID, `NestDeviceService` to start the stream.
*   **`Reset Oauth Credentials` (reset-credentials.tsx):**
    * **Purpose:** Clears the stored Google OAuth tokens, forcing re-authentication on the next use of the main command.
    *   **Dependencies:** Uses `OAuthManager`.

**Key Services (Classes):**

*   **`OAuthManager` (src/services/auth/OAuthManager.ts):**
    *   **Purpose:** Manages Google OAuth 2.0 authentication using Raycast's `OAuth.PKCEClient`.
    *   **API:**
        *   `getInstance(): OAuthManager` (Singleton)
        *   `getValidToken(): Promise<OAuth2Token>`: Retrieves valid OAuth tokens. If tokens are missing or expired, initiates the authorization flow or refreshes tokens.
        *   `clearTokens(): Promise<void>`: Clears stored OAuth tokens.
        *   `onTokenRefresh(callback: () => void)`: Registers a callback to be called when tokens are refreshed.
    *   **Dependencies:** `@raycast/api`, `node-fetch`, `crypto`.
    *   **Configuration:** Uses configuration from `getConfig()` (which reads Raycast preferences).

*   **`NestDeviceService` (src/services/camera/NestDeviceService.ts):**
    *   **Purpose:** Interacts with the Google Smart Device Management API to retrieve camera information and generate RTSP stream URLs.
    *   **API:**
        *   `getInstance(): NestDeviceService` (Singleton)
        *   `listCameras(): Promise<NestCamera[]>`:  Retrieves a list of Nest cameras, filtering for supported models (1st gen Indoor). Caches results for 1 minute.
        *   `getCameraDetails(deviceId: string): Promise<NestCamera>`: Gets detailed information about a single camera.
        *   `openStream(deviceId: string): Promise<void>`: Opens the stream by passing device id and camera's name.
        *   `getRtspStreamUrl(deviceId: string): Promise<RtspStreamResponse>`:  Generates an RTSP stream URL for a given camera.
        *   `refreshRtspUrl(deviceId: string, extensionToken: string): Promise<RtspStreamResponse>`: Extends the lifetime of an existing RTSP stream.
        *   `cleanup(): Promise<void>`: Cleans up resources (stops camera monitoring, cleans up RTSP streams).
        *  `getRtspUrl(deviceId: string): Promise<string>`: Retrieves an RTSP stream url.
    *   **Dependencies:** `OAuthManager`, `node-fetch`, `@raycast/api`, `RtspStreamService`.
    *   **Error Handling:**  Handles API errors and rate limiting with exponential backoff retries. Displays user-friendly error messages via toasts.
    *   **Configuration:** Uses `projectId` from `getConfig()`.

*   **`ProcessManager` (src/services/process/ProcessManager.ts):**
    *   **Purpose:** Manages the lifecycle of FFplay processes used for RTSP streaming.
    *   **API:**
        *   `getInstance(): ProcessManager` (Singleton)
        *   `startRtspStream(deviceId: string, rtspUrl: string, cameraName?: string): Promise<StreamProcess>`: Starts an FFplay process for the given RTSP URL.
        *   `stopStream(deviceId: string): Promise<void>`: Stops the FFplay process associated with a device ID.
        *   `cleanup(): Promise<void>`: Stops all active FFplay processes.
        *   `getActiveProcess(deviceId: string): StreamProcess | undefined`: Gets the active stream process for a given device ID.
        *   `getAllActiveProcesses(): StreamProcess[]`: Gets all active stream processes.
    *   **Dependencies:** `child_process`, `@raycast/api`, `fs`, `path`.
    *   **Error Handling:** Handles FFplay errors and displays appropriate toasts.
    *   **External Script:** Uses `assets/scripts/nest-player.sh` to launch FFplay. It attempts to find this script in multiple locations for development and production builds.

*   **`RtspStreamService` (src/services/rtsp/RtspStreamService.ts):**
    *   **Purpose:**  A higher-level service that coordinates `NestDeviceService` and `ProcessManager` to start and stop RTSP streams.
    *   **API:**
        *   `getInstance(): RtspStreamService` (Singleton)
        *   `startStream(deviceId: string, cameraName: string): Promise<void>`: Starts the RTSP stream for the given device.
        *   `stopStream(deviceId: string): Promise<void>`: Stops the RTSP stream.
        *   `getStreamStatus(deviceId: string): StreamStatus`: Gets the status of a stream.
        *   `cleanup(): Promise<void>`: Cleans up resources (calls `ProcessManager.cleanup()`).
    *   **Dependencies:** `NestDeviceService`, `ProcessManager`, `@raycast/api`.

*   **`QuickAccessService` (src/services/quickaccess/QuickAccessService.ts):**
    *   **Purpose:** Manages the "Quick Access" camera feature, storing and retrieving the user's preferred camera.
    *   **API:**
        *   `getInstance(): QuickAccessService` (Singleton)
        *   `setQuickAccessCamera(camera: NestCamera): Promise<void>`: Sets the quick access camera.
        *   `getQuickAccessCameraId(): Promise<string | null>`: Gets the ID of the quick access camera.
        *   `isQuickAccessCamera(cameraId: string): Promise<boolean>`: Checks if a camera is set as quick access.
        *   `clearQuickAccessCamera(): Promise<void>`: Clears the quick access camera setting.
    *   **Dependencies:** `@raycast/api` (LocalStorage).

**Types:**

*   **`NestCamera` (src/types.ts):** Represents a Nest camera.
*   **`StreamProcess` (src/services/process/ProcessManager.ts):** Represents a running FFplay process.
*   **`StreamStatus` (src/services/rtsp/RtspStreamService.ts):** Enum representing the state of an RTSP stream.
*  ...and other types related to responses from the Nest API.

**Components:**

*   **`CameraList` (src/components/CameraList.tsx):**  A Raycast List component displaying a list of Nest cameras.
*   **`CameraListItem` (src/components/CameraListItem.tsx):**  A Raycast List.Item component representing a single camera in the list.
*   **`CameraView` (src/components/CameraView.tsx):** A Raycast Detail component displaying detailed information about a specific camera.

## Dependencies and Requirements

*   **Dependencies:**
    *   `@raycast/api`: Raycast API for building extensions.
    *   `node-fetch`: Used for making HTTP requests to the Google Nest API.
    *   `crypto`: Used for generating code verifiers and challenges for PKCE authentication.
    *   `@fastify/cors`, `@fastify/static`, `fastify`, `@types/node-static`, `node-static` - listed in the `package.json` but seemingly unused in the provided code.
*   **Requirements:**
    *   **macOS 12.0 or later.**
    *   **Raycast 1.50.0 or later.**
    *   **FFmpeg/FFplay installed:**  Essential for RTSP streaming.  Install via `brew install ffmpeg`.
    *   **Google Device Access registration:**  Requires a one-time $5 fee.
    *   **Google Cloud OAuth2 client credentials:**  See the "Installation" section for setup instructions.

## Advanced Usage Examples

*   **Resetting OAuth Credentials:** If you encounter authentication issues, you can use the `Reset Oauth Credentials` command to clear your stored tokens and re-authenticate.

* **Direct Stream URL (for debugging):** The core logic of playing the stream resides in `assets/scripts/nest-player.sh`. You can, in theory, use its logic to directly play a stream from the terminal for debugging:
      ```bash
    ./assets/scripts/nest-player.sh <RTSP_URL> "<CAMERA_NAME>"
    ```
     Replace `<RTSP_URL>` with a valid RTSP URL obtained from the Nest API and `<CAMERA_NAME>` with camera's name. You would need to manually handle acquiring a valid URL through the Nest API for this, however.  This script also handles window positioning.

*   **Understanding the logs:** If you encounter problems, refer to the logs as described in the TROUBLESHOOTING section of the README.

This documentation focuses on the public interfaces and how to use the extension. Internal details are described to give a better understanding of the architecture, but users primarily interact with it through Raycast commands.


--- End of Documentation ---
