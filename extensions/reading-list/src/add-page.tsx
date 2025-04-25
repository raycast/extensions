import { LocalStorage, showToast, Toast } from "@raycast/api";
import { Page } from "./types";
import { getMetadata } from "./utils/metadata";

interface Arguments {
  url: string;
}

export default async function Command(props: { arguments: Arguments }) {
  const { url } = props.arguments;

  if (!url) {
    showToast({
      style: Toast.Style.Failure,
      title: "Please enter a URL!",
    });
    return;
  }

  try {
    const metadata = await getMetadata(url);
    const pages = await LocalStorage.getItem<string>("pages");
    const pagesArray: Page[] = pages ? JSON.parse(pages) : [];
    const now = new Date().toISOString();

    const existingPageIndex = pagesArray.findIndex((page) => page.url === url);
    const newPage: Page = {
      url,
      title: metadata.title,
      description: metadata.description,
      imageUrl: metadata.image,
      faviconUrl: metadata.favicon,
      createdAt: now,
      updatedAt: now,
      tagIds: existingPageIndex !== -1 ? pagesArray[existingPageIndex].tagIds : [],
      isRead: false,
    };

    if (existingPageIndex !== -1) {
      pagesArray[existingPageIndex] = newPage;
    } else {
      pagesArray.push(newPage);
    }

    await LocalStorage.setItem("pages", JSON.stringify(pagesArray));

    showToast({
      style: Toast.Style.Success,
      title: "Page saved successfully!",
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "An error occurred!",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
