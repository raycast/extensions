Packing repository using repomix...
Querying Gemini AI using gemini-2.0-pro-exp-02-05...
Okay, let's review the design and PRD for your Raycast extension, focusing on feasibility within Raycast's environment and potential challenges.  I'll combine feedback on both documents, as they are closely related.

**Overall Assessment:**

The overall approach is sound and *mostly* feasible. You've correctly identified the core technologies (OAuth, Google SDM API, WebRTC) and have a good understanding of the necessary steps. However, there are some Raycast-specific nuances and potential limitations that need careful consideration, and some areas where the design needs refinement.

**Key Strengths:**

*   **Correct API Usage:** You're using the correct Google SDM API and have identified the WebRTC and RTSP paths, with a preference for WebRTC (which is the right choice for newer cameras).
*   **OAuth Understanding:** The OAuth flow with PKCE and token refresh is correctly described, and you're planning to use Raycast's secure storage, which is essential.
*   **Component-Based Design:**  The separation of concerns into Authentication, Camera Management, and Stream Handling is good software design.
*   **Error Handling:**  You've included error handling considerations, which is crucial for a good user experience.
*   **Future Considerations:** The "Future Considerations" section shows good planning for potential enhancements.
* **React Components:** The architecture leverages React and its best practices.

**Major Areas for Modification and Concerns:**

1.  **Video Rendering within Raycast (The Biggest Challenge):**

    *   **`Detail` Component Limitations:**  Raycast's `Detail` component is primarily designed for Markdown and *may not natively support an HTML5 `<video>` element in a way that allows for full WebRTC playback*.  You've identified this as a potential issue and proposed some workarounds (injecting HTML via Markdown, using a custom component), but these are *not guaranteed to work reliably*.  Raycast's rendering engine might sanitize or restrict certain HTML elements and JavaScript for security and stability reasons.
    *   **Alternative: `Grid` (Potentially Better, Still Limited):** Raycast's `Grid` component *might* offer a slightly better chance of displaying video, but it's designed for images, and you'd likely be limited to very small, frequently updated thumbnails (essentially MJPEG, not a true WebRTC stream).  This is a *major deviation* from the desired "live feed" experience.
    *   **Fallback: Open in Browser (Least Desirable, Most Likely to Work):**  The most reliable, but least integrated, fallback would be to open the WebRTC stream in the user's default web browser.  This is a significant departure from the goal of embedding the feed *within* Raycast.  You could use Raycast's `open` command for this.
    *   **Recommendation: Prototyping is *CRITICAL***.  Before investing heavily in the WebRTC signaling and API logic, *immediately* create a simple Raycast extension that tries to render *any* video (e.g., a local MP4 file) using the `Detail` component, the `Grid` component, and potentially a custom component. This will *immediately* reveal whether direct video playback within Raycast is feasible.  If it's not, you *must* adjust your core design.

2.  **WebRTC Implementation Details:**

    *   **`simple-peer` vs. `werift-webrtc`:**  You've mentioned both.  `werift-webrtc` is a more robust, native Node.js WebRTC implementation and is generally preferred for server-side or non-browser environments.  `simple-peer` is excellent for browser environments but relies on the browser's built-in WebRTC implementation.  Since Raycast extensions run in a Node.js context, `werift-webrtc` is likely the better choice, *but* you'll need to verify it works correctly within Raycast's sandboxed Node.js environment.  Raycast might restrict certain native modules.
    *   **Signaling:** You correctly mention implementing signaling through the Google SDM API.  This is *crucial*.  You cannot rely on a separate signaling server.  The `CameraLiveStream.GenerateWebRtcStream` command handles the SDP offer/answer exchange.  Ensure your code correctly handles this exchange, including any ICE candidate information returned by the API.
    *   **Reconnection:** Your `WebRTCStreamHandler` includes reconnection logic, which is excellent.  WebRTC connections can be fragile, and handling dropped connections gracefully is essential.  Test this thoroughly.

3.  **Token Refresh During Streaming:**

    *   **Proactive Refresh:**  You've correctly identified the need for proactive token refresh (refreshing *before* expiration).  Your proposed 5-minute buffer is a good starting point.
    *   **Seamless Refresh:**  The key is to ensure the refresh happens *without interrupting the video stream*.  This means the refresh must occur in the background, and the `DeviceAPIClient` must be able to update the token used by the `WebRTCStreamHandler` without tearing down the existing peer connection. This requires careful synchronization.
    *   **Recommendation: Dedicated Refresh Timer:**  Consider a dedicated timer within the `OAuthManager` that *always* runs, checking the token expiry and refreshing as needed.  This timer should be independent of any specific stream.

4.  **RTSP Handling (Legacy Support):**

    *   **Deprioritize:** You've correctly identified that RTSP is for legacy cameras.  Given the complexities of handling RTSP within Raycast (and the lack of native browser support), *strongly consider deprioritizing RTSP support* for the initial version.  Focus on WebRTC first. If you *must* support RTSP, the "open in external player" approach is the most practical, but it's a poor user experience.
    *   **No RTSP in Raycast UI:** It is *highly unlikely* you'll be able to render RTSP directly within Raycast's UI.

5.  **Project ID Configuration:**

    *   **User Preference:** You correctly suggest storing the Google Device Access Project ID as a user preference. This is the right approach.  Use Raycast's `getPreferenceValues` and `setPreferenceValues` to manage this.  Provide clear instructions in your extension's README on how users can find their Project ID.

6.  **Hotkey Access:**

    *   **Dedicated Command:** Your approach of creating a separate command for the "quick access" hotkey is correct and follows Raycast best practices.  Storing the favorite camera ID in `LocalStorage` is also the right way to handle this.

7.  **Error Handling (Refinement):**

    *   **Specific Error Codes:**  Use more specific error codes in your `StreamError` class.  This will allow you to handle different error scenarios (e.g., authentication failure, network error, camera offline) with different UI messages and recovery strategies.
    *   **Raycast `showToast`:**  Use Raycast's `showToast` API to display error messages to the user in a non-intrusive way.
    *   **Retry Logic:**  Implement retry logic for recoverable errors (e.g., temporary network issues).

8. **UI/UX:**
    - **If using browser fallback, use List.Item.OpenAction**
    - **If using Raycast UI, be sure to optimize the UI to minimize re-renders**

**Code Review (Specific Points):**

*   **`oauth.ts`:**  The code is well-structured and uses Raycast's OAuth API correctly.  Ensure you handle potential errors during the token exchange and refresh processes (e.g., network errors, invalid grant).
*   **`list-cameras.tsx`:**
    *   **Camera Filtering:**  Your filtering logic is good. You correctly handle cases where the camera name might be missing.
    *   **Loading State:**  You're using `isLoading` correctly.
    *   **Error Handling:**  You're using `showToast` for errors, which is good.
    *   **`protocols`:**  Storing the supported protocols (`WEB_RTC`, `RTSP`) is a good idea for later filtering.
*   **`LiveCameraFeed.tsx`:**
    *   **WebRTC Logic:**  The core WebRTC logic is *mostly* correct, but again, *the success of this component hinges entirely on whether Raycast can render the video stream*.
    *   **RTSP Fallback:**  As mentioned, the RTSP fallback is a significant compromise.
    *   **Cleanup:**  Your cleanup logic (closing the peer connection) is essential.
    *   **`videoHTML` Hack:**  The `videoHTML` string and the attempt to inject it via Markdown are *highly suspect*.  This is the area most likely to break.
*   **`quick-camera.tsx`:**  The logic for the quick access command is correct.  You're handling the case where no favorite camera is set.

**Implementation Plan (Revised):**

1.  **Video Rendering Prototype (Highest Priority):**  Create a *minimal* Raycast extension that *only* tries to display a video.  Test with:
    *   A local MP4 file (to verify basic video playback).
    *   A simple WebRTC stream (you can use a test stream or a simple peer-to-peer setup between two browser windows).
    *   Try the `Detail` component, the `Grid` component, and a custom component.
    *   If none of these work, your fallback is `open` in browser.

2.  **OAuth and Camera List:**  Implement the OAuth flow and camera list retrieval. This part is relatively straightforward and should work as described.

3.  **WebRTC Signaling (Conditional):**  *If* the video rendering prototype is successful, implement the WebRTC signaling logic with the Google SDM API.

4.  **Token Refresh:**  Implement the proactive token refresh mechanism in the `OAuthManager`.

5.  **RTSP Support (Optional):**  Only implement RTSP support if absolutely necessary, and use the "open in external player" approach.

6.  **Hotkey and Preferences:**  Implement the hotkey command and the Project ID preference.

7.  **Thorough Testing:**  Test *every* aspect of the extension, especially the WebRTC connection, reconnection, and token refresh.

**In summary, the feasibility of your project *heavily* depends on whether you can render a WebRTC video stream directly within Raycast's UI. The prototype in step 1 is absolutely critical. Be prepared to adjust your design significantly if direct video rendering is not possible.**
