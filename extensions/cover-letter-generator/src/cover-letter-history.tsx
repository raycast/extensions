import { useEffect, useState } from "react";
import CoverLetterHistory from "./components/historyCoverLetter";
import { getCoverLetterHistory } from "./util/storage";
import { CoverLetterInfo } from "./type";

export default function Command() {
  const [coverLettrs, setCoverLettrs] = useState<CoverLetterInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const fetchCoverLetterHistory = async () => {
      const history = await getCoverLetterHistory();
      setCoverLettrs(history);
      setIsLoading(false);
    };
    fetchCoverLetterHistory();
  }, []);

  return <CoverLetterHistory data={coverLettrs} isLoading={isLoading} />;
}
