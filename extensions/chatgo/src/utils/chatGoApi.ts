import { LocalStorage, Toast, getPreferenceValues, openExtensionPreferences, showToast } from "@raycast/api";
import {
  addMyTemplateService,
  chat,
  clone2MyTemplateService,
  createTemplateService,
  deleteMyTemplateService,
  getAccountBalanceService,
  getFavoriteListService,
  getImagesService,
  getMemberInfoService,
  getMyTemplateListService,
  getMyTemplateTagsService,
  getPromptTemplatesService,
  loginAccount,
  pinTemplateService,
  removeMyTemplateService,
  updateMyTemplateService,
} from "../service";
import { ChatParams, GetImagesOps, Message, TemplateBaseOps, TemplateModel } from "../type";

class ChatGoAPi {
  token: string | undefined;
  password: string | undefined;
  email: string | undefined;
  expiresTime: string | undefined;
  templateList: TemplateModel[] = [];

  constructor() {
    (async () => {
      const preferenceValues = getPreferenceValues<{
        email: string;
        password: string;
      }>();
      this.email = preferenceValues.email.trim();
      this.password = preferenceValues.password.trim();
      this.token = await LocalStorage.getItem<string>("token");
      await this.checkAccountBalance();
      await this.getMineTPL();
    })();
  }

  public getMyTemplateList = async (refresh = false) => {
    if (refresh) {
      return await this.getMineTPL();
    }
    return this.templateList.length >= 1 ? this.templateList : await this.getMineTPL();
  };

  public createChat = async (
    options: Omit<ChatParams, "token" | "data"> & {
      data: { messages: Message[] };
      model: TemplateModel;
    }
  ) => {
    const { data, model, onClose, onMessage, onError } = options;
    const token = await this.checkToken();
    const defaultOps = {
      templateId: model.template_id,
      templateName: model.template_name,
      systemPrompt: model.content,
      temperature: model.temperature,
    };
    await chat({
      data: {
        ...defaultOps,
        ...data,
      },
      token,
      onMessage,
      onClose,
      onError,
    });
  };

  public getImages = async (ops: GetImagesOps) => {
    const token = await this.checkToken();
    return getImagesService(ops, token);
  };

  public getPromptTemplates = async (ops: { name?: string; tag?: string; type?: 1 | 2 | 3 }) => {
    const token = await this.checkToken();
    return getPromptTemplatesService(ops, token);
  };

  public getFavoriteList = async (ops: { name?: string }) => {
    const token = await this.checkToken();
    return getFavoriteListService(ops, token);
  };

  public addTemplateForMine = async (templateId: number) => {
    const token = await this.checkToken();
    return addMyTemplateService(templateId, token);
  };

  public removeMyTemplate = async (id: number) => {
    const token = await this.checkToken();
    return removeMyTemplateService(id, token);
  };

  public moveUpMyFavoriteTPl = async (id: number) => {
    const token = await this.checkToken();
    return pinTemplateService(id, token);
  };

  public getMyTemplateTags = async () => {
    const token = await this.checkToken();
    return getMyTemplateTagsService(token);
  };

  public updateMyTemplate = async (ops: TemplateBaseOps) => {
    const token = await this.checkToken();
    return updateMyTemplateService(ops, token);
  };
  public createTemplate = async (ops: TemplateBaseOps) => {
    const token = await this.checkToken();
    return createTemplateService(ops, token);
  };
  public clone2MyTemplate = async (id: number) => {
    const token = await this.checkToken();
    return clone2MyTemplateService(id, token);
  };
  public deleteMyTemplate = async (id: number) => {
    const token = await this.checkToken();
    return deleteMyTemplateService(id, token);
  };
  public getMemberInfo = async () => {
    const token = await this.checkToken();
    return getMemberInfoService(token);
  };

  private getToken = async () => {
    return this.token || (await this.login());
  };

  private checkToken = async () => {
    const token = await this.getToken();
    return new Promise<string>((resolve, reject) => {
      if (!token) {
        const msg = "Token went wrong, Please retry again";
        showToast({
          style: Toast.Style.Failure,
          title: msg,
        }).then();
        reject(msg);
        return;
      }
      resolve(token);
    });
  };

  public getAccountBalance = async () => {
    const token = await this.checkToken();
    return getAccountBalanceService(token);
  };

  private checkAccountBalance = async () => {
    try {
      const token = this.token;
      if (!token) {
        await this.login();
        await this.checkAccountBalance();
        return;
      }
      const response = await this.getAccountBalance();
      const { data } = response;
      if (data.code === "000000") {
        const { token_balance: tokenBalance } = data.data;
        if (tokenBalance <= 0) {
          throw new Error("Your account balance is exhausted, please recharge");
        }
      } else if (data.code === "000008") {
        await this.login();
        await this.checkAccountBalance();
      }
      await Promise.resolve(data);
    } catch (error: any) {
      await showToast({
        title: error?.message || "Login Failed, Please check you email and password",
        style: Toast.Style.Failure,
      });

      return Promise.reject(error);
    }
  };

  private login = async (email?: string, password?: string) => {
    try {
      const e = email || this.email;
      const p = password || this.password;
      if (!e || !p) {
        throw new Error("Email or Password is lost, Please Check!");
      }
      const response = await loginAccount({
        email: e,
        password: p,
      });
      const { data } = response;
      if (data.code === "000000") {
        const { token, expiresTime } = data.data;
        this.token = token;
        this.expiresTime = expiresTime;
        LocalStorage.setItem("token", token).then();
        LocalStorage.setItem("expiresTime", expiresTime).then();
        return Promise.resolve(this.token);
      } else {
        throw new Error(data.msg);
      }
    } catch (error: any) {
      await showToast({
        title: error?.message || "Login Failed, Please check you email and password",
        style: Toast.Style.Failure,
      });
      await openExtensionPreferences();
      return Promise.reject(error);
    }
  };

  private getMineTPL = async () => {
    try {
      const token = await this.checkToken();
      const { data } = await getMyTemplateListService(token);
      if (data.code === "000000") {
        this.templateList = data.data;
        return Promise.resolve(this.templateList);
      } else if (data.code === "000008") {
        await this.login();
        await this.getMineTPL();
      }
    } catch (error) {
      console.log("error", error);
    }
  };
}

export default ChatGoAPi;
