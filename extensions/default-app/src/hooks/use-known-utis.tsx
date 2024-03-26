import { useCachedState } from "@raycast/utils";
import { useCallback, useState } from "react";

import { UniformType } from "../types/uniform-type";
import { getApplication } from "../utitlities/swift/get-application";
import { getKnownUniformTypes } from "../utitlities/swift/get-known-uniform-types";
import { setDefaultApplication } from "../utitlities/swift/set-default-application";
import { useEffectOnce } from "./use-effect-once";

export function useKnownUniformTypes() {
  const [isLoading, setIsLoading] = useState(false);
  const [knownUnfiformTypes, setKnownUnfiformTypes] = useCachedState<Array<UniformType>>("known-uniform-types");

  const revalidate = useCallback(async () => {
    setIsLoading(true);
    const knownUnfiformTypes = await getKnownUniformTypes();
    setKnownUnfiformTypes(knownUnfiformTypes);
    setIsLoading(false);
  }, [setKnownUnfiformTypes]);

  useEffectOnce(() => {
    revalidate();
  });

  const setHandler = useCallback(
    async (
      values: { applicationPath: string; uniformTypeId: string },
      options?: Partial<{ onError: (error: unknown) => void }>,
    ) => {
      try {
        await setDefaultApplication({
          for: "type",
          applicationPath: values.applicationPath,
          uniformTypeId: values.uniformTypeId,
        });

        const application = await getApplication(values.applicationPath);

        setKnownUnfiformTypes((prev) => {
          if (prev === undefined) {
            return undefined;
          }

          const next = [...prev];

          const prevUniformType = next.find((uniformType) => uniformType.id === values.uniformTypeId);

          if (prevUniformType) {
            prevUniformType.application = application;
          }

          return next;
        });

        revalidate();
      } catch (error) {
        if (options?.onError) {
          options.onError(error);
        } else {
          throw error;
        }
      }
    },
    [revalidate, setKnownUnfiformTypes],
  );

  return {
    data: knownUnfiformTypes,
    isLoading: isLoading,
    revalidate: revalidate,
    setHandler: setHandler,
  };
}
