import CoreLocation
import RaycastSwiftMacros

struct KLocation: Codable {
    var latitude: Double
    var longitude: Double
    var thoroughfare: String?  // street name
    var subThoroughfare: String?  // house number
    var locality: String?  // city
    var subLocality: String?  // areas in the city
    var administrativeArea: String?  // state or province
    var subAdministrativeArea: String?  // state or sub-provincial administrations
    var postalCode: String?  // postal code
    var country: String?  // country
    var countryCode: String?  // country code
}

enum LocationError: Error {
    case geocodingFailed
    case invalidProximityValue
    case other(Error)
}

@raycast func getLocationFromAddress(address: String) async throws -> KLocation {
    let geocoder = CLGeocoder()
    let geocodedPlacemarks = try await geocoder.geocodeAddressString(address)
    guard let placemark = geocodedPlacemarks.first, let location = placemark.location else {
        throw LocationError.geocodingFailed
    }
    return KLocation(
        latitude: location.coordinate.latitude,
        longitude: location.coordinate.longitude,
        thoroughfare: placemark.thoroughfare,
        subThoroughfare: placemark.subThoroughfare,
        locality: placemark.locality,
        subLocality: placemark.subLocality,
        administrativeArea: placemark.administrativeArea,
        subAdministrativeArea: placemark.subAdministrativeArea,
        postalCode: placemark.postalCode,
        country: placemark.country,
        countryCode: placemark.isoCountryCode
    )
}


