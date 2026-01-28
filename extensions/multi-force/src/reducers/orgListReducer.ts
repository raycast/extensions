import { MISC_ORGS_SECTION_LABEL } from "../constants";
import { OrgListReducerAction, OrgListReducerType, DeveloperOrg } from "../types";
import { deduplicateList, saveOrgs } from "../utils";
import { sortOrgList } from "../utils/orgUtility";

const groupOrgs = (orgs: DeveloperOrg[]): Map<string, DeveloperOrg[]> => {
  const orgMap = new Map<string, DeveloperOrg[]>();
  for (const org of orgs) {
    const section = org.section ?? MISC_ORGS_SECTION_LABEL;
    if (!orgMap.has(section)) {
      orgMap.set(section, []);
    }
    orgMap.get(section)!.push(org);
  }
  return orgMap;
};

const addOrg = (orgMap: Map<string, DeveloperOrg[]>, newOrg: DeveloperOrg): DeveloperOrg[] => {
  const orgs = Array.from(orgMap.values()).flat();
  orgs.push(newOrg);
  return orgs;
};

const updatedOrg = (orgMap: Map<string, DeveloperOrg[]>, updatedOrg: DeveloperOrg): DeveloperOrg[] => {
  const updatedOrgs = deleteOrg(orgMap, updatedOrg);
  updatedOrgs.push(updatedOrg);
  return updatedOrgs;
};

const deleteOrg = (orgMap: Map<string, DeveloperOrg[]>, deletedOrg: DeveloperOrg): DeveloperOrg[] => {
  const orgs = Array.from(orgMap.values()).flat();
  return orgs.filter((org) => org.alias !== deletedOrg.alias);
};

const handleAction = (orgs: Map<string, DeveloperOrg[]>, action: OrgListReducerAction): DeveloperOrg[] => {
  switch (action.type) {
    //The thinking is the caller will always manage setting updating the storage and this will just set a list of orgs to set.
    case OrgListReducerType.SET_ORGS: {
      return action.setOrgs!;
    }
    case OrgListReducerType.ADD_ORG: {
      return addOrg(orgs, action.newOrg!);
    }
    case OrgListReducerType.UPDATE_ORG: {
      return updatedOrg(orgs, action.updatedOrg!);
    }
    case OrgListReducerType.DELETE_ORG: {
      return deleteOrg(orgs, action.deletedOrg!);
    }
    default: {
      throw Error("Unknown action: " + action.type);
    }
  }
};

export default function orgListReducer(
  orgs: Map<string, DeveloperOrg[]>,
  action: OrgListReducerAction,
): Map<string, DeveloperOrg[]> {
  const updatedOrgList = handleAction(orgs, action);
  saveOrgs(updatedOrgList);
  return groupOrgs(deduplicateList(sortOrgList(updatedOrgList)));
}
