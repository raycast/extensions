import { getSelectedText, open, showToast, Toast } from "@raycast/api";

export default async function Command() {

  try {
        const selectedText = await getSelectedText();
        const URL = `mkdictionaries:///?text=${selectedText}`; 
        await open(URL);            
    } catch (error) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Unable to get sected text",
            message: error instanceof Error ? error.message : "An error occurred",
        });
    }
}