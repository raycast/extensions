import { CertListView } from "./CertListView";
import { CertSelectionView } from "./CertSelectionView";
import { parsePemCertificates } from "../utils/x509utils";

interface CertificateViewProps {
  certText: string;
}

export function CertificateView({ certText }: CertificateViewProps) {
  // Parse multiple certificates from the input
  const certificates = parsePemCertificates(certText);

  if (certificates.length === 0) {
    // No valid certificates found, still try to show in CertListView
    // in case the input format is different but still parsable
    return <CertListView certText={certText} />;
  }

  if (certificates.length === 1) {
    return <CertListView certText={certificates[0]} />;
  }

  return <CertSelectionView certificates={certificates} />;
}
