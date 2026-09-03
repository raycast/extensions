import { OperationResult, ProfileDocument, ScrollProfile } from "../domain/models";

export interface ProfileRepository {
  load(): Promise<OperationResult<ProfileDocument>>;
  save(document: ProfileDocument): Promise<OperationResult<void>>;
  upsert(profileKey: string, profile: ScrollProfile): Promise<OperationResult<void>>;
}
