import axios, { AxiosInstance } from "axios";

export class BringAPI {
  private instance: AxiosInstance;
  private isAuthenticated: boolean = false;
  private authenticationPromise: Promise<AuthResponse> | null = null;
  private userUuid: string = "";
  private defaultListUuid: string = "";

  constructor() {
    this.instance = axios.create({
      baseURL: "https://api.getbring.com/rest/v2",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-encoding": "gzip, deflate, br",
        "x-bring-api-key": "cof4Nc6D8saplXjE3h3HXqHH8m7VU2i1Gs0g85Sp",
        "x-bring-client": "webApp",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  }

  public async login(email: string, password: string): Promise<BringAPI> {
    if (!this.isAuthenticated) {
      if (!this.authenticationPromise) {
        this.authenticationPromise = this.bringAuth(email, password);
      }
      try {
        const { uuid, access_token: token, bringListUUID: defaultListUuid } = await this.authenticationPromise;
        this.setAuthToken(token);
        this.userUuid = uuid;
        this.defaultListUuid = defaultListUuid;
        this.isAuthenticated = true;
      } catch (error) {
        if (error instanceof Error && error.message.includes("401")) {
          throw new Error("Failed to authenticate with Bring! Please check your credentials.");
        }
        throw error;
      }
    }

    return this;
  }

  setAuthToken = (token: string) => {
    this.instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  };

  private bringAuth(email: string, password: string): Promise<AuthResponse> {
    const url = `/bringauth`;

    const data = new URLSearchParams();
    data.append("email", email);
    data.append("password", password);

    return this.instance.post<AuthResponse>(url, data).then((response) => response.data);
  }

  getUserSettings(userUuid = this.userUuid) {
    return this.instance.get<BringUserSettings>(`/bringusersettings/${userUuid}`).then((response) => response.data);
  }

  getLists(userUuid = this.userUuid) {
    return this.instance.get<BringLists>(`/bringusers/${userUuid}/lists`).then((response) => response.data);
  }

  getListCustomItems(listUuid = this.defaultListUuid) {
    return this.instance.get<BringCustomItem[]>(`/bringlists/${listUuid}/details`).then((response) => response.data);
  }

  getList(listUuid = this.defaultListUuid) {
    return this.instance.get<BringList>(`/bringlists/${listUuid}`).then((response) => response.data);
  }

  addItemToList(listUuid: string, article: string, specification?: string) {
    const data = new URLSearchParams();
    data.append("uuid", this.defaultListUuid);
    data.append("purchase", article);
    data.append("specification", specification ?? "");

    return this.instance.put(`/bringlists/${listUuid}`, data).then((response) => response.data);
  }

  removeItemFromList(listUuid: string, article: string) {
    const data = new URLSearchParams();
    data.append("uuid", this.defaultListUuid);
    data.append("remove", article);

    return this.instance.put(`/bringlists/${listUuid}`, data).then((response) => response.data);
  }

  getTranslations(locale: string = "de-CH") {
    return this.instance
      .get<Translations>(`https://web.getbring.com/locale/articles.${locale}.json`)
      .then((response) => response.data);
  }

  getCatalog(locale: string = "de-CH") {
    return this.instance
      .get<BringCatalog>(`https://web.getbring.com/locale/catalog.${locale}.json`)
      .then((response) => response.data);
  }
}

export interface AuthResponse {
  uuid: string;
  publicUuid: string;
  email: string;
  name: string;
  photoPath: string;
  bringListUUID: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface BringCatalog {
  language: string;
  catalog: {
    sections: Section[];
  };
}
interface Section {
  sectionId: string;
  name: string;
  items: Item[];
}

interface Item {
  itemId: string;
  name: string;
}

export interface BringCustomItem {
  uuid: string;
  itemId: string;
  listUuid: string;
  userIconItemId: string;
  userSectionId: string;
  assignedTo: string;
  imageUrl: string;
}

export interface BringLists {
  lists: BringListInfo[];
}

export interface BringListInfo {
  listUuid: string;
  name: string;
  theme: string;
}

export interface BringList {
  uuid: string;
  status: string;
  purchase: BringListItem[];
  recently: BringListItem[];
}

export interface BringListItem {
  name: string;
  specification?: string;
}

export interface BringUserSettings {
  usersettings: UserSetting[];
  userlistsettings: UserListSettings[];
}

interface UserSetting {
  key:
    | "apiAiDefaultList"
    | "apiAiMainInvocationCount"
    | "autoPush"
    | "badgeMode"
    | "defaultListUUID"
    | "experiment-admob-group"
    | "experiment-admob-group-configuration"
    | "experiment_ads_recommended_and_intro"
    | "is18OrOlder"
    | "listStyle"
    | "purchaseStyle"
    | "pushChannelOffers"
    | "pushChannelRecipes"
    | "theme"
    | "userPostalCode"
    | "userShoppingPostalCode";
  value: string;
}

interface UserListSettings {
  listUuid: string;
  usersettings: ListUserSetting[];
}

interface ListUserSetting {
  key: "listArticleLanguage" | "listSectionOrder";
  value: string;
}

export interface Translations {
  "Eigene Artikel": string;
  "Zuletzt verwendet": string;
  [key: string]: string;
}
