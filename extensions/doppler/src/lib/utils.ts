import { BaseHTTPError } from "@dopplerhq/node-sdk";
import { showFailureToast } from "@raycast/utils";

export async function handleError(error: Error | BaseHTTPError) {
    let message = ("title" in error) ? error.title : error.message;
    if ("detail" in error) {
        const details = error.detail as unknown as { messages: string[], success: false };
        message = details.messages[0];
    }
    
    await showFailureToast(message, {
        title: "Doppler Error"
    });
}