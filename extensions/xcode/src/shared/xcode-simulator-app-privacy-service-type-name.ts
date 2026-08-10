import { XcodeSimulatorAppPrivacyServiceType } from "../models/xcode-simulator/xcode-simulator-app-privacy-service-type.model";

/**
 * Xcode Simulator App Privacy Service Type Name
 * @param serviceType The XcodeSimulatorAppPrivacyServiceType
 */
export function XcodeSimulatorAppPrivacyServiceTypeName(serviceType: XcodeSimulatorAppPrivacyServiceType): string {
  switch (serviceType) {
    case XcodeSimulatorAppPrivacyServiceType.all:
      return "All";
    case XcodeSimulatorAppPrivacyServiceType.calendar:
      return "Calendar";
    case XcodeSimulatorAppPrivacyServiceType.contactsLimited:
      return "Contacts (Limited)";
    case XcodeSimulatorAppPrivacyServiceType.contacts:
      return "Contacts";
    case XcodeSimulatorAppPrivacyServiceType.location:
      return "Location";
    case XcodeSimulatorAppPrivacyServiceType.locationAlways:
      return "Location (Always)";
    case XcodeSimulatorAppPrivacyServiceType.photosAdd:
      return "Photos (Write)";
    case XcodeSimulatorAppPrivacyServiceType.photos:
      return "Photos (Read)";
    case XcodeSimulatorAppPrivacyServiceType.mediaLibrary:
      return "Media Library";
    case XcodeSimulatorAppPrivacyServiceType.microphone:
      return "Microphone";
    case XcodeSimulatorAppPrivacyServiceType.motion:
      return "Motion";
    case XcodeSimulatorAppPrivacyServiceType.reminders:
      return "Reminders";
    case XcodeSimulatorAppPrivacyServiceType.siri:
      return "Siri";
  }
}
