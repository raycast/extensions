import { client } from "@/features/auth/api/oauth";
import { BASE_URL } from "@/lib/config";
import {
  PrototypeCreate,
  PrototypeCreateResult,
  PrototypeForDetails,
  PrototypeForList,
  PrototypeForListSchema,
} from "@/types/prototype";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

export async function createPrototype(payload: PrototypeCreate, onSuccess?: () => void) {
  const tokens = await client.getTokens();
  const accessToken = tokens?.accessToken;
  if (!accessToken) {
    throw new Error("Not logged in");
  }
  const response = await fetch(`${BASE_URL}/api/raycast/create-prototype`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  const result = {
    success: data?.prototypeId ? true : false,
    prototype: {
      prototypeId: data?.prototypeId,
      alloyUrl: data?.alloyUrl,
      createdAt: data?.createdAt,
      createdBy: data?.createdBy,
      type: data?.type,
    },
  };

  if (result.success && onSuccess) {
    onSuccess();
  }

  return result;
}

export async function getPrototype(prototypeId: string) {
  try {
    const tokens = await client.getTokens();
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      await showToast({
        style: Toast.Style.Failure,
        title: "You are not authorized. Redirecting to login...",
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await client.removeTokens();
      throw new Error("Not logged in");
    }
    const response = await fetch(`${BASE_URL}/api/raycast/get-prototype?prototypeId=${prototypeId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    if (!data) {
      throw new Error("Cannot find the Alloy prototype");
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch prototype", error);
    throw new Error("Failed to fetch prototype");
  }
}

export async function listPrototypes() {
  try {
    const tokens = await client.getTokens();
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      await showToast({
        style: Toast.Style.Failure,
        title: "You are not authorized. Redirecting to login...",
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await client.removeTokens();

      throw new Error("Not logged in");
    }

    const response = await fetch(`${BASE_URL}/api/raycast/list-prototypes`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    const result: PrototypeForList[] = data.map((prototype: unknown) => PrototypeForListSchema.parse(prototype));
    return result;
  } catch (error) {
    console.error("Failed to fetch prototypes", error);
    throw new Error("Failed to fetch prototypes");
  }
}

export async function deletePrototype(prototypeId: string, onSuccess?: () => void) {
  try {
    const tokens = await client.getTokens();
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      throw new Error("Not logged in");
    }
    const response = await fetch(`${BASE_URL}/api/raycast/delete-prototype?prototypeId=${prototypeId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await response.json();
    if (data?.success) {
      if (onSuccess) {
        onSuccess();
      }
      return {
        success: true,
        message: "Prototype deleted successfully",
      };
    }
    return {
      success: false,
      message: "Internal server error: Failed to delete prototype",
    };
  } catch (error) {
    console.error("Failed to delete prototype", error);
    throw new Error("Failed to delete prototype");
  }
}

export function usePrototypeDetail(prototype: PrototypeCreateResult | PrototypeForList) {
  const prototypeId = prototype.prototypeId;

  const { data, error, isLoading, mutate } = useCachedPromise(getPrototype, [prototypeId], {
    initialData: {
      createdBy: "",
      ...prototype,
    } as PrototypeForDetails,
  });

  return {
    prototype: data as PrototypeForDetails,
    prototypeError: error,
    isLoadingPrototype: isLoading,
    mutateDetail: mutate,
  };
}

export function usePrototypes() {
  const { data, error, isLoading, mutate } = useCachedPromise(listPrototypes, []);
  const prototypes = data;

  return {
    prototypes: prototypes,
    prototypesError: error,
    isLoadingPrototypes: isLoading,
    mutatePrototypes: mutate,
  };
}
