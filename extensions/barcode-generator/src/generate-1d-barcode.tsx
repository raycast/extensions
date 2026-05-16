import { BarcodeTypeListCommand, ONE_D_BARCODE_TYPES } from "./barcode-components";

export default function Command() {
  return (
    <BarcodeTypeListCommand
      kind="1D"
      searchBarPlaceholder="Choose a 1D barcode type"
      barcodeTypes={ONE_D_BARCODE_TYPES}
    />
  );
}
