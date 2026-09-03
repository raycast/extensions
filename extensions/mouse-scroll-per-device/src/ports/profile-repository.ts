import { OperationResult, ProfileDocument } from "../domain/models";

export interface ProfileRepository {
  load(): Promise<OperationResult<ProfileDocument>>;
  save(document: ProfileDocument): Promise<OperationResult<void>>;
}
