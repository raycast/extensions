import { renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useActionVisibility } from "@/hooks/useActionVisibility";
import { ActionContext, ActionGroups } from "@/types/actions";

describe("useActionVisibility", () => {
  const mockActionGroups: ActionGroups = {
    primary: [
      {
        id: "always-visible",
        title: "Always Visible",
        category: "workflow",
        showWhen: "always",
        onAction: () => {},
      },
    ],
    copy: [
      {
        id: "copy-when-variants",
        title: "Copy When Variants",
        category: "workflow",
        showWhen: "hasVariants",
        content: "test",
      },
    ],
    generate: [],
    secondary: [],
    management: [],
    destructive: [],
  };

  test("shows actions when conditions are met", () => {
    const context: ActionContext = {
      hasVariants: true,
      hasFormValues: false,
      hasCustomContent: false,
      isProcessing: false,
      hasSelection: false,
      showAdvanced: false,
    };

    const { result } = renderHook(() => useActionVisibility(mockActionGroups, context));

    expect(result.current.primary).toHaveLength(1);
    expect(result.current.copy).toHaveLength(1);
  });

  test("hides actions when conditions are not met", () => {
    const context: ActionContext = {
      hasVariants: false,
      hasFormValues: false,
      hasCustomContent: false,
      isProcessing: false,
      hasSelection: false,
      showAdvanced: false,
    };

    const { result } = renderHook(() => useActionVisibility(mockActionGroups, context));

    expect(result.current.primary).toHaveLength(1); // always visible
    expect(result.current.copy).toHaveLength(0); // hidden
  });
});
