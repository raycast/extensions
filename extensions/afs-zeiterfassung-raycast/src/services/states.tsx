import { StateRequestDTO } from "../dto/state.dto";
import Http, { HttpFunctionResult } from "./http";
import { StateItem } from "../models/models";

export interface StateItemDTO {
  id: number;
  description: string;
}

export default class States {
  private http: Http;

  constructor(public afsPreferences: ExtensionPreferences) {
    this.http = new Http(afsPreferences);
  }

  /**
   * Ruft die Liste der Zeiterfassung-Status ab.
   * @returns
   */
  public async getStates(): Promise<HttpFunctionResult<StateItem[]>> {
    const result: HttpFunctionResult<StateItemDTO[]> = await this.http.GET<StateItemDTO[]>("userstate/all");

    if (!result.success) return { success: false };
    return {
      success: true,
      data: result.data!.map((item: StateItemDTO) => ({ id: item.id, title: item.description })),
    };
  }

  /**
   * Updatet den Status eines Benutzers.
   * @param {number} stateId Id des Status, der aktualisiert werden soll.
   * @param {number} userId
   * @returns
   */
  public async updateState(stateId: number): Promise<HttpFunctionResult> {
    const result: HttpFunctionResult = await this.http.PUT<undefined, StateRequestDTO>("user/state", {
      state: stateId,
    });
    return result;
  }
}
