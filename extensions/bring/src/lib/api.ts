import axios, { AxiosInstance } from "axios";

export class BringAPI {
  private instance: AxiosInstance;

  private email: string;
  private password: string;
  private userUuid: string = "";
  private defaultListUuid: string = "";

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
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

  getUserSettings(userUuid = this.userUuid) {
    return this.instance
      .get<BringUserSettings>(`https://api.getbring.com/rest/v2/bringusersettings/${userUuid}`)
      .then((response) => response.data);
  }

  getListCustomItems(listUuid = this.defaultListUuid) {
    return this.instance
      .get<CustomItem[]>(`https://api.getbring.com/rest/v2/bringlists/${listUuid}/details`)
      .then((response) => response.data);
  }

  getList(listUuid = this.defaultListUuid) {
    return this.instance
      .get<List>(`https://api.getbring.com/rest/v2/bringlists/${listUuid}`)
      .then((response) => response.data);
  }

  getArticles(locale: string = "de-CH") {
    return this.instance
      .get<object>(`https://web.getbring.com/locale/articles.${locale}.json`)
      .then((response) => response.data);
  }

  getCatalog(locale: string = "de-CH") {
    return this.instance
      .get<Catalog>(`https://web.getbring.com/locale/catalog.${locale}.json`)
      .then((response) => response.data);
  }

  addItemToList(article: string, specification?: string) {
    const url = `https://api.getbring.com/rest/v2/bringlists/${this.defaultListUuid}`;

    const data = new URLSearchParams();
    data.append("uuid", this.defaultListUuid);
    data.append("purchase", article);
    data.append("specification", specification ?? "");

    return this.instance.put(url, data).then((response) => response.data);
  }

  removeItemFromList(article: string) {
    const url = `https://api.getbring.com/rest/v2/bringlists/${this.defaultListUuid}`;

    const data = new URLSearchParams();
    data.append("uuid", this.defaultListUuid);
    data.append("remove", article);

    return this.instance.put(url, data).then((response) => response.data);
  }

  public async login() {
    const {
      uuid,
      access_token: token,
      bringListUUID: defaultListUuid,
    } = await this.bringAuth(this.email, this.password);
    this.setAuthToken(token);
    this.userUuid = uuid;
    this.defaultListUuid = defaultListUuid;
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

export interface Catalog {
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

export interface CustomItem {
  uuid: string;
  itemId: string;
  listUuid: string;
  userIconItemId: string;
  userSectionId: string;
  assignedTo: string;
  imageUrl: string;
}

export interface List {
  uuid: string;
  status: string;
  purchase: ListItem[];
  recently: ListItem[];
}

export interface ListItem {
  specification?: string;
  name: string;
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
