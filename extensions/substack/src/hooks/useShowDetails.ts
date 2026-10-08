import { useEffect, useState } from "react";

export default function useShowDetails(query: string) {
  const [showDetails, setShowDetails] = useState<boolean>(false);

  useEffect(() => {
    if (query === "") {
      setShowDetails(false);
    }
  }, [query]);

  return { showDetails, setShowDetails };
}
