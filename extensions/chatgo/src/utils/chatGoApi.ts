import { LocalStorage, Toast, getPreferenceValues, openExtensionPreferences, showToast } from "@raycast/api";
import {
  addMyTemplateService,
  chat,
  getAccountBalance,
  getFavoriteListService,
  getImagesService,
  getMyTemplateListService,
  getPromptTemplatesService,
  loginAccount,
  removeMyTemplateService,
} from "../service";
import { ChatParams, GetImagesOps, Message, TemplateModel } from "../type";

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

  public getMyTemplateList = async (refreash = false) => {
    if (refreash) {
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
    const token = await this.getToken();
    // console.log("getToken", token);
    // const templateList = await this.getMyTemplateList();
    if (!token) {
      console.log("token 缺失");
      return;
    }
    const defaultOps = {
      templateId: model.template_id,
      templateName: model.template_name,
      systemPrompt: model.content,
      temperature: model.temperature,
    };
    // if (templateList.length) {
    //   const { content, temperature, template_name: templateName, template_id: templateId } = templateList[0];
    //   defaultOps = {
    //     templateId,
    //     templateName,
    //     systemPrompt: content,
    //     temperature,
    //   };
    // }
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
    const token = await this.getToken();
    if (!token) {
      console.log("token 缺失");
      return;
    }
    return getImagesService(ops, token);
  };

  public getPromptTemplates = async (ops: { name?: string; tag?: string }) => {
    const token = await this.getToken();
    if (!token) {
      console.log("token 缺失");
      return;
    }
    return getPromptTemplatesService(ops, token);
  };

  public getFavoriteList = async (ops: { name?: string }) => {
    const token = await this.getToken();
    if (!token) {
      console.log("token 缺失");
      return;
    }
    return getFavoriteListService(ops, token);
  };

  public addTemplateForMine = async (templateId: number) => {
    const token = await this.getToken();
    if (!token) {
      console.log("token 缺失");
      return;
    }
    return addMyTemplateService(templateId, token);
  };

  public removeMyTemplate = async (id: number) => {
    const token = await this.getToken();
    if (!token) {
      console.log("token 缺失");
      return;
    }
    return removeMyTemplateService(id, token);
  };

  private getToken = async () => {
    return this.token || (await this.login());
  };

  private checkAccountBalance = async () => {
    try {
      const token = this.token;
      if (!token) {
        await this.login();
        await this.checkAccountBalance();
        return;
      }
      const response = await getAccountBalance(token);
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
        throw new Error("Email or Password is lost, Plaease Check!");
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
        LocalStorage.setItem("token", token);
        LocalStorage.setItem("expiresTime", expiresTime);
        return Promise.resolve(this.token);
      } else {
        throw new Error(data.msg);
      }
    } catch (error: any) {
      console.log("login error: ", error.message);
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
      const token = await this.getToken();
      if (!token) {
        await this.login();
        await this.getMineTPL();
        return;
      }
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
