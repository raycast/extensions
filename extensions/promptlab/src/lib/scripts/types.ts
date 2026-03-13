/**
 * The output of a data provider such as a script or fetch request.
 */
export type DataProviderOutput = {
  /**
   * The full text of the data provider's output.
   */
  stringValue: string;
};

/**
 * The output of an image data provider.
 */
export type ImageData = DataProviderOutput & {
  /**
   * Text extracted from the image.
   */
  imageText: string;

  /**
   * Coordinates of the image's points of interest.
   */
  imagePOI: string;

  /**
   * Payload values of barcodes and QR codes in the image.
   */
  imageBarcodes: string;

  /**
   * Labels for animals identified in the image.
   */
  imageAnimals: string;

  /**
   * Center coordinates and dimensions of rectangles identified in the image.
   */
  imageRectangles: string;

  /**
   * Labels for objects identified in the image.
   */
  imageSubjects: string;

  /**
   * The number of faces identified in the image.
   */
  imageFaces: string;

  /**
   * The angle of the horizon in the image.
   */
  imageHorizon: string;

  /**
   * The EXIF data of the image in JSON string format.
   */
  imageEXIFData?: string;
};

/**
 * The output of a PDF data provider.
 */
export type PDFData = DataProviderOutput & {
  /**
   * Text extracted from the PDF without using OCR.
   */
  pdfRawText: string;

  /**
   * Text extracted from the PDF using OCR.
   */
  pdfOCRText: string;
};

/**
 * The output of an audio data provider.
 */
export type AudioData = DataProviderOutput & {
  /**
   * Labels for sounds identified in the audio.
   */
  soundClassifications: string;
};
