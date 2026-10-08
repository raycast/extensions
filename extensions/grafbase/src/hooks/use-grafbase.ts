import { LocalStorage, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { GetScopesQuery } from "../gql/graphql";
import useSharedState from "./use-shared-state";

// export const BasicUserFragment = /* GraphQL */ `
//   fragment BasicUserInfo on User {
//     id
//     name
//     avatarUrl
//   }
// `;

// export const BasicMembershipInfoFragment = /* GraphQL */ `
//   fragment BasicMembershipInfo on Member {
//     account {
//       id
//       slug
//       name
//     }
//   }
// `;

// export const BasicPersonalAccountInfoFragment = /* GraphQL */ `
//   fragment BasicPersonalAccountInfo on PersonalAccount {
//     id
//     name
//     slug
//   }
// `;

export const GetScopesDocument = /* GraphQL */ `
  query GetScopes {
    viewer {
      # ...BasicUserInfo
      id
      name
      avatarUrl
      personalAccount {
        # ...BasicPersonalAccountInfo
        id
        name
        slug
      }
      organizationMemberships {
        # ...BasicMembershipInfo
        account {
          id
          slug
          name
        }
      }
    }
  }
`;

const { apiUrl, accessToken } = getPreferenceValues();

export const useGrafbase = () => {
  const [avatarUrl, setAvatarUrl] = useSharedState("avatarUrl");
  const [personalAccount, setPersonalAccount] = useSharedState("personalAccount");
  const [organizationMemberships, setOrganizationMemberships] = useSharedState("organizationMemberships");
  const [activeSlug, setActiveSlug] = useSharedState("activeSlug");

  // TODO memo

  // TODO create a single client
  useFetch<{ data: GetScopesQuery; errors: any }>(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: GetScopesDocument,
    }),
    onError(error) {
      console.error(error);
      showToast({
        title: "Oops",
        message: error?.message ?? "Something went wrong. Try again later.",
        style: Toast.Style.Failure,
      });
    },
    async onData({ data: { viewer }, errors }) {
      if (errors) {
        console.error(errors);
        showToast({
          title: "Oops",
          message: errors[0]?.message ?? "Something went wrong. Try again later.",
          style: Toast.Style.Failure,
        });
        return;
      }

      setAvatarUrl(viewer?.avatarUrl);
      setPersonalAccount(viewer?.personalAccount);
      setOrganizationMemberships(viewer?.organizationMemberships);

      const localActiveSlug = await LocalStorage.getItem("activeSlug");

      if (localActiveSlug) {
        setActiveSlug(localActiveSlug);
      } else {
        // TODO
      }
    },
  });

  const handleActiveSlugChange = async (activeSlug: string) => {
    setActiveSlug(activeSlug);
    await LocalStorage.setItem("activeSlug", activeSlug);
  };

  return {
    avatarUrl,
    personalAccount,
    organizationMemberships,
    activeSlug,
    setActiveSlug: handleActiveSlugChange,
  };
};
