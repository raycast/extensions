import { LocalStorage } from "@raycast/api";
import { LinkItem } from "./types";

class Service {
  static async getLinks() {
    const links = await LocalStorage.getItem("links");
    return links ? JSON.parse(String(links)) : [];
  }

  static async setLink(item: LinkItem) {
    const links = await this.getLinks();
    links.push(item);
    await LocalStorage.setItem("links", JSON.stringify(links));
  }

  static async updateLink(id: string, item: LinkItem) {
    const links = await this.getLinks();
    const index = links.findIndex((link: LinkItem) => link.id === id);
    if (index !== -1) {
      links[index] = item;
      await LocalStorage.setItem("links", JSON.stringify(links));

      return true;
    }

    return false;
  }

  static async deleteLink(index: number) {
    const links = await this.getLinks();
    links.splice(index, 1);
    await LocalStorage.setItem("links", JSON.stringify(links));

    return links;
  }
}

export default Service;
