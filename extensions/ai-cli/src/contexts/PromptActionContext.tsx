import { createContext, ReactNode, useContext } from "react";
import { CustomTone } from "@/hooks/useCustomTones";
import { CustomTemplate } from "@/hooks/useCustomTemplates";

/**
 * Context interface for prompt action dependencies
 */
export interface PromptActionContextValue {
  getToneById: (id: string) => CustomTone | undefined;
  getTemplateById: (id: string) => CustomTemplate | undefined;
  maxLength: number;
}

/**
 * Context for sharing prompt action dependencies across components
 */
const PromptActionContext = createContext<PromptActionContextValue | undefined>(undefined);

interface PromptActionProviderProps {
  children: ReactNode;
  getToneById: (id: string) => CustomTone | undefined;
  getTemplateById: (id: string) => CustomTemplate | undefined;
  maxLength: number;
}

export function PromptActionProvider({ children, getToneById, getTemplateById, maxLength }: PromptActionProviderProps) {
  const value: PromptActionContextValue = {
    getToneById,
    getTemplateById,
    maxLength,
  };

  return <PromptActionContext.Provider value={value}>{children}</PromptActionContext.Provider>;
}

export function usePromptActionContext(): PromptActionContextValue {
  const context = useContext(PromptActionContext);
  if (context === undefined) {
    throw new Error("usePromptActionContext must be used within a PromptActionProvider");
  }
  return context;
}
