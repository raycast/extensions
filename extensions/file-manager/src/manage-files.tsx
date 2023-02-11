import { useCallback, useRef, useState } from "react";
import { Directory } from "./ui/Directory";
import { getStartDirectory } from "./utils";
import { AppContext, AppContextType } from "./utils/AppContext";

export default function Command() {
  const [pathInContext, setPathInContext] = useState("");

  const refShouldReRender = useRef(false);

  const renderDirectory = useCallback((path: string) => {
    setPathInContext(path);
    refShouldReRender.current = true;
  }, []);

  const markFinishRenderingDirectory = useCallback(() => {
    refShouldReRender.current = false;
  }, []);

  const shouldReRender = useCallback(() => {
    return refShouldReRender.current;
  }, []);

  const value: AppContextType = {
    path: pathInContext,
    renderDirectory,
    markFinishRenderingDirectory,
    shouldReRender,
  };

  return (
    <AppContext.Provider value={value}>
      <Directory path={getStartDirectory()} />
    </AppContext.Provider>
  );
}
