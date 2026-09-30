import { useEffect, useRef } from "react";

function useOnce(callback: () => void, condition: boolean): void {
  const hasRun = useRef(false);

  useEffect(() => {
    // 只有当条件为 true 且之前未执行过时，才执行回调
    if (condition && !hasRun.current) {
      callback();
      hasRun.current = true;
    }
  }, [condition, callback]);
}

export default useOnce;
