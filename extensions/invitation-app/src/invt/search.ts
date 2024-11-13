import { showToast, Toast } from "@raycast/api";

export async function search(term: string) {
  if (!term.trim()) {
    return [];
  }

  try {
    const response = await fetch(
      `https://invt.app/search/${encodeURIComponent(term)}`
    );

    if (!response.ok) {
      throw new Error(`Search failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    showToast({
      style: Toast.Style.Failure,
      title: "Search Error",
      message: err.message,
    });
    return [];
  }
}