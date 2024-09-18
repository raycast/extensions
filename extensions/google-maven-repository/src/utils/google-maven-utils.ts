import { isEmpty } from "./common-utils";
import fetch, { AbortError } from "node-fetch";
import { queryPackagesURL } from "./constans";
import { artifactMapModel, artifactModel, PackageResponseModel } from "../types/packages-model";
import { showToast, Toast } from "@raycast/api";

export type ArtifactTag = {
  title: string;
  value: string;
};

export const fetchArtifacts = async (searchContent: string) => {
  const _tagList: ArtifactTag[] = [];
  const _artifactName: string[] = [];
  const _artifactInfo: artifactModel[][] = [];
  if (isEmpty(searchContent)) {
    return { tagList: _tagList, artifactName: _artifactName, artifactInfo: _artifactInfo };
  }
  try {
    const response = await fetch(queryPackagesURL + searchContent);
    const data = (await response.json()) as PackageResponseModel;
    const artifactMap = data.data as artifactMapModel[];
    const tempTagList: ArtifactTag[] = [];
    if (typeof artifactMap !== "undefined" && artifactMap !== null) {
      artifactMap.forEach((_artifactMap) => {
        Object.values(_artifactMap.artifactMap).forEach((_artifact) => {
          _artifactInfo.push(_artifact.reverse());
        });
        Object.keys(_artifactMap.artifactMap).forEach((_artifact) => {
          if (_artifactName.includes(_artifact)) {
            _artifactName.push(_artifact);
          } else {
            _artifactName.push(_artifact);
            tempTagList.push({ title: _artifact, value: _artifact });
          }
        });
      });
    }
    const finalList = tempTagList.slice(0, 5);
    const __artifactInfo = _artifactInfo.slice(0, 5);
    const __artifactName = _artifactName.slice(0, 5);
    finalList.sort((a, b) => {
      return a.title.localeCompare(b.title);
    });
    _tagList.push({ title: `Artifacts(${finalList.length})`, value: "Artifacts" });
    return {
      tagList: _tagList.concat(finalList),
      artifactName: __artifactName.sort(),
      artifactInfo: __artifactInfo.sort((a, b) => a[0].artifact.localeCompare(b[0].artifact)),
    };
  } catch (e) {
    if (e instanceof AbortError) {
      return { tagList: _tagList, artifactName: _artifactName, artifactInfo: _artifactInfo };
    }
    await showToast(Toast.Style.Failure, String(e));
  }
  return { tagList: _tagList, artifactName: _artifactName, artifactInfo: _artifactInfo };
};
