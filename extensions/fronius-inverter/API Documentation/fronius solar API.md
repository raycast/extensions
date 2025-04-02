##### EN

/ Perfect Charging / Perfect Welding / Solar Energy

Fronius Solar API V

```
Operating Instructions
```
##### 42,0410,2012,EN 021 - 21012025



## Contents



- 1 Introduction
- 2 General Considerations
   - 2.1 Output Formats
   - 2.2 Fronius GEN24 and Tauro....................................................................................................................................
      - 2.2.1 Client Generation using OAS
      - 2.2.2 Inverter to inverter communication
   - 2.3 Data Types
      - 2.3.1 Numeric Types
      - 2.3.2 Date/Time
   - 2.4 Requests
      - 2.4.1 Querying of API version
      - 2.4.2 Addressing of devices
   - 2.5 Responses
      - 2.5.1 Availability
      - 2.5.2 Common Response Header
      - 2.5.3 Request Body
   - 2.6 Timeout
- 3 Enable/Disable
- 4 Realtime Requests
   - 4.1 GetInverterRealtimeData request
      - 4.1.1 Availability
      - 4.1.2 Collection availability
      - 4.1.3 URL for HTTP requests
      - 4.1.4 Parameters
      - 4.1.5 Data Collections
      - 4.1.6 Object structure of response body (Scope ”Device”)
      - 4.1.7 Example of response body (Scope ”Device”)
      - 4.1.8 Object structure of response body (Scope ”System”)
      - 4.1.9 Example of response body (Scope ”System”)
   - 4.2 GetSensorRealtimeData request
      - 4.2.1 Availability
      - 4.2.2 URL for HTTP requests
      - 4.2.3 Parameters
      - 4.2.4 Data Collections
      - 4.2.5 Object structure of response body (DataCollection ”NowSensorData”)
      - 4.2.6 Example of response body (DataCollection ”NowSensorData”)
      - 4.2.7 Object structure of response body (DataCollection ”MinMaxSensorData”)
      - 4.2.8 Example of response body (DataCollection ”MinMaxSensorData”)
   - 4.3 GetStringRealtimeData request
      - 4.3.1 Availability
      - 4.3.2 URL for HTTP requests
      - 4.3.3 Parameters
      - 4.3.4 Collection availability
      - 4.3.5 Data Collections
         - StringControlData”) 4.3.6 Object structure of response body (DataCollection ”NowStringControlData” and ”CurrentSum-
      - 4.3.7 Example of response body (DataCollection ”CurrentSumStringControlData”)
      - 4.3.8 Object structure of response body (DataCollection ”LastErrorStringControlData”)
      - 4.3.9 Example of response body (DataCollection ”LastErrorStringControlData”)
      - 4.3.10 Object structure of response body (DataCollection ”NowStringControlData”)
      - 4.3.11 Example of response body (DataCollection ”NowStringControlData”)
   - 4.4 GetLoggerInfo request
      - 4.4.1 Availability
      - 4.4.2 URL for HTTP requests
      - 4.4.3 Object structure of response body
      - 4.4.4 Example of response body
   - 4.5 GetLoggerLEDInfo request
      - 4.5.1 Availability
      - 4.5.2 URL for HTTP requests
      - 4.5.3 Object structure of response body
      - 4.5.4 Example of response body
   - 4.6 GetInverterInfo request
      - 4.6.1 Availability
      - 4.6.2 URL for HTTP requests
      - 4.6.3 Object structure of response body
      - 4.6.4 Example of response body
      - 4.6.5 Meaning of numerical status codes
   - 4.7 GetActiveDeviceInfo request
      - 4.7.1 Availability
      - 4.7.2 URL for HTTP requests
      - 4.7.3 Parameters
      - 4.7.4 DeviceClass is not System
      - 4.7.5 DeviceClass is System
   - 4.8 GetMeterRealtimeData request
      - 4.8.1 Availability
      - 4.8.2 URL for HTTP requests
      - 4.8.3 Parameters
      - 4.8.4 Devicetypes and provided channels
      - 4.8.5 Channel Descriptions
      - 4.8.6 Meter Location Dependend Directions (primary meter)
      - 4.8.7 Meter Location Dependend Directions (secondary meter)
      - 4.8.8 System-Request
      - 4.8.9 Device-Request
   - 4.9 GetStorageRealtimeData request
      - 4.9.1 Availability
      - 4.9.2 3rd Party Batteries
      - 4.9.3 Supported
      - 4.9.4 URL for HTTP requests
      - 4.9.5 Parameters
      - 4.9.6 Reference to manual
      - 4.9.7 Channel Descriptions
      - 4.9.8 System-Request
      - 4.9.9 Device-Request
   - 4.10 GetOhmPilotRealtimeData request
      - 4.10.1 Availability
      - 4.10.2 URL for HTTP requests
      - 4.10.3 Parameters
      - 4.10.4 Reference to manual
      - 4.10.5 System-Request
      - 4.10.6 Device-Request
   - 4.11 GetPowerFlowRealtimeData request
      - 4.11.1 Availability
      - 4.11.2 Version......................................................................................................................................................
      - 4.11.3 URL for HTTP requests
      - 4.11.4 Parameters
      - 4.11.5 Request
- 5 Archive Requests
   - 5.1 Common
      - 5.1.1 Availability
      - 5.1.2 ChannelId
      - 5.1.3 Parameters
      - 5.1.4 Object Structure of response body
   - 5.2 Example of response body
      - 5.2.1 Meter data
      - 5.2.2 Inverter data
      - 5.2.3 Errors - Structure
      - 5.2.4 Events - Structure
      - 5.2.5 OhmPilot Energy
- 6 Definitions and Mappings
   - 6.1 Sunspec State Mapping
   - 6.2 Inverter Device Type List.....................................................................................................................................
   - 6.3 Event Table for Fronius Devices
   - 6.4 Hybrid_Operating_State
   - 6.5 Meter Locations
- 7 Changelog
- 8 Frequently asked questions


## 1& It is strongly recommended to use appropriate frameworks or tools to parse json objects properly

## 1 Introduction

The Fronius Solar API is a means for third parties to obtain data from various Fronius devices (inverters, Sensor-
Cards, StringControls) in a defined format through a central facility which acts as a proxy (e.g. Fronius Datalogger
Web or Fronius Solar.web).

Currently, the only way to interact with this API is by making a HTTP request to a specific CGI. The URLs for
the particular requests and the devices supporting them are listed at the beginning of each request description.
The API is versioned, meaning that multiple versions of this API may be available on the same device. The URLs
in this document always point to the version of the API which this document describes. The highest supported
version on the device can be queried. See 2.4.1 for details.
In order to check your product for compatibility with this version of the API specification, please see the separate
document provided for this purpose.

The API divides roughly into realtime and archive requests: Realtime requests will obtain the data directly from the
devices and can therefore only be used when the devices are not in standby or unavailable in any other manner.
Archive requests will use the data stored in a central logging facility to obtain the results and are of course not
subjected to the former limitation.

## 2 General Considerations

### 2.1 Output Formats

Currently, the only output format supported is JSON, a lightweight data interchange format. It is easy to read
and write for both humans and machines and it offers some advantages over XML, like basic typing and a leaner
structure.

### 2.2 Fronius GEN24 and Tauro....................................................................................................................................

#### 2.2.1 Client Generation using OAS

We provide an OpenAPI interface specification 1 file for GEN24/Tauro/Verto inverters to support client generation
in multiple languages.

```
Download the file here: https://www.fronius.com/QR-link/0025.
```
To display the spec you can use https://editor.swagger.io, for proper client generation please use https:
//openapi-generator.tech.

#### 2.2.2 Inverter to inverter communication

Collecting data from multiple inverters in the same network is not supported by so called system requests on
GEN24/Tauro/Verto devices. To gather the information please invoke ident requests on all GEN24/Tauro/Verto
inverters interested by you.

### 2.3 Data Types

#### 2.3.1 Numeric Types

JSON only knows one kind of numeric type, which can represent both floating point and integer values. It is how-
ever possible to specify a type in JSON description, but it is always in the hands of the interpreting system into
which datatype a numeric node is converted.
Which range a certain numeric node actually can have is often determined by the device providing the value,
and may also vary depending on the type of device (e.g. ”UAC” can be an integer value on older inverters, but a
floating point value on newer ones).

(^1) https://swagger.io/specification


## 1& Use HTTP-GET requests to query data from Solar API

```
# all Datamanager and Hybridmanager support only APIVersion 1
```
This means we cannot reliably specify value ranges for all requests. So it is the responsibility of the API user
to determine whether a value fits into a certain datatype in his language of choice.
What we can do is to specify whether a certain value is a floating point value (marked as ”number”) or an integer
value (marked as ”integer”), where ”integer” must not be interpreted as the datatype ”int” like available in C/C++,
it just means it is a value without decimal places.
For these specifications, please refer to the sections discussing the respective request.

Examples

number 1, - 2, 0, 4, 4.0, 0.001, - 10.002, ....

integer 1, - 2, 0, 4, - 10

unsigned integer 1, 0, 4, 10

unsigned number 1, 0, 4, 10, 0.001, 14.

#### 2.3.2 Date/Time

Information on date/time is always (and can only be) represented by a string. The format for these strings inside
this API has been defined as follows.

- Strings which include information on both date and time are always in RFC3339 format with time zone offset
    or Zulu marker.
    See Section 5.6 of RFC
    Example 1: 2011 - 10 - 20T10:23:17+02:00 (UTC+2)
    Example 2: 2011 - 10 - 20T08:23:17Z (UTC)
- Strings which only include information on the date are of the format yyyy-MM-dd.
- Strings which only include information on the time are of the format hh:mm:ss.
- If no information on the time zone is given, any date/time specification is considered to be in local time of
    the PV system.
- Gen24 requests are always in UTC format.

### 2.4 Requests

Currently, the only request protocol supported is HTTP.

#### 2.4.1 Querying of API version

The highest supported version on the device can be queried using the URL
/solar_api/GetAPIVersion.cgi.

```
Listing 1: Object structure of GetAPIVersion response
```

{
" A PIVersion" : 1,
" BaseURL" : "/ solar_api/v1/",
" CompatibilityRa nge" : "1.5 - 9"
}

```
object {
```
```
object Head: {}*;
```
```
object Body: {}*;
```
}

```
" MgmtTimerRemainingTime" : - 1,
```
```
Listing 2: Example: Complete response for GetAPIVersion request
```
#### 2.4.2 Addressing of devices

A specific device is identified by the string parameter DeviceId.
For Fronius Solar Net devices this string shall contain the numeric address of the targeted device.
Future generations of Fronius devices may also use non numerical addresses, so this API is designed to allow
for both.

### 2.5 Responses

The response will always be a valid JSON string ready to be evaluated by standard libraries.
If the response is delivered through HTTP, the Content-Type Header shall be either text/javascript or
application/json.

All JSON structures are described using Orderly JSON, a textual format for describing JSON data. Please refer
to the online documentation on https://github.com/lloyd/orderly/ for details.
Note that the definitions of some response bodies are not totally accurate, because there’s no (known) way to
express nodes named after values/channels (e.g. objects which are named ”PAC” or ”Power”). But each descrip-
tion is accompanied by an example which should clear up any uncertainty.

The contents of the response object will vary depending on the preceding request but it always contains a common
response header and a request body.

```
Listing 3: Object structure of valid response
```
```
Listing 4: Example: Complete response for GetInverterRealtimeData request on non hybrid system
```

#### 2.5.1 Availability

A request is listed as ”Available” if the response http code differs to 404 (not found). It does not relay to technical
compatibility nor functionality.

#### 2.5.2 Common Response Header

The common response header (CRH) is present in every response. It indicates, among other things, whether the
request has been successful and the body of the response is valid.

```
Listing 5: Object Structure of Common Response Header
```
```
" RequestArguments" : {
```

```
Value Status Description
0 OKAY Request successfully finished, Data are valid
1 NotImplemented The request or a part of the request is not implemented yet
2 Uninitialized Instance of APIRequest created, but not yet configured
3 Initialized Request is configured and ready to be sent
4 Running Request is currently being processed (waiting for response)
5 Timeout Response was not received within desired time
6 Argument Error Invalid arguments/combination of arguments or missing arguments
7 LNRequestError Something went wrong during sending/receiving of LN-message
8 LNRequestTimeout LN-request timed out
9 LNParseError Something went wrong during parsing of successfully received LN-message
10 ConfigIOError Something went wrong while reading settings from local config
11 NotSupported The operation/feature or whatever is not supported
12 DeviceNotAvailable The device is not available
255 UnknownError undefined runtime error
```
```
Table 1: Error Code Table
```
#### 2.5.3 Request Body

The request body contains the actual data produced by the request and is therefore different for each request.
The object structures of the various response bodies will be detailed later in the description of the respective API
request.

### 2.6 Timeout

Up to 2 realtime requests are allowed to be performed in parallel with keeping a timeout of 4 seconds between
two consecutive calls.
Archive requests are not allowed to be performed in parallel and need to keep a timeout of 120 seconds between
two consecutive calls.

## 3 Enable/Disable

The Solar API’s enable/disable feature is available on GEN24 only.

The configuration to enable or disable the Solar API can be found in the WebUI under Communication - So-
lar API ( 1 ).

If the Solar API is disabled, a Solar API request will return with a 404 - HTTP-error and the message ”Solar API

```
OK
```
```
NOT when
```

```
Figure 1: Solar API activation/deactivation
```
disabled by customer config” will be displayed.

Default enable/disable behaviour:

- For new devices with a bundle version of 1.14.1 or higher the Solar API is deactivated per default.
- For existing devices which are updated, the Solar API remains enabled.
- If a factory reset is performed with existing devices running a bundle version of 1.14.1 or higher, the Solar
    API will be deactivated per default as well.

## 4 Realtime Requests

These requests will be provided where direct access to the realtime data of the devices is possible. This is cur-
rently the case for the Fronius Datalogger Web and the Fronius Datamanager.

In order to eliminate the need to specify each wanted value separately when making a request or querying each
value separately, so called ”Data Collections” were defined.
The values in these collections are gathered from one or more Fronius Solar Net messages and supplied to the
user in a single response to a certain request.
It may be the case that more values are queried from the device than the user is interested in, but the overhead
caused by these superfluous values should be negligible compared to the advantages this strategy provides for
the user.

If a device cannot provide some values of a DataCollection (e.g. because they are not implemented on
the device) then those values are omitted from the response.

### 4.1 GetInverterRealtimeData request

This request does not care about the configured visibility of single inverters. All inverters are reported.

#### 4.1.1 Availability

```
Platform
Fronius Hybrid
Fronius Non Hybrid
Fronius GEN24/Tauro/Verto
```
```
Since version
Not all DataCollections supported
ALWAYS
Not all DataCollections supported
```
#### 4.1.2 Collection availability

```
DataCollection
supported on
```
```
CumulationInverterData
CommonInverterData
3PInverterData
MinMaxInverterData
```
```
Fronius Hybrid Systems
Yes
Yes
Yes
NO
```
```
Fronius GEN24/Tauro/Verto
Yes
Yes
Only on 3 phase inverters
NO
```

#### 4.1.3 URL for HTTP requests

/solar_api/v1/GetInverterRealtimeData.cgi

#### 4.1.4 Parameters

```
Parameter Type Range/Values/Pattern Description
Scope String ”Device”
”System”
```
```
Query specific device(s)
or whole system (uses collection ”Cumu-
lationInverterData”)
DeviceId String Solar Net: 0 ...99 Only needed for Scope ”Device”
Which inverter to query.
DataCollection String ”CumulationInverterData”
”CommonInverterData”
”3PInverterData”
”MinMaxInverterData”
```
```
Only needed for Scope ”Device”
Selects the collection of data that should
be queried from the device.
See 4.1.5 for details.
```
#### 4.1.5 Data Collections

CumulationInverterData Values which are cumulated to generate a system overview.

```
Value name specific data type Description
PAC integer AC power (negative value for consuming power)
DAY_ENERGY unsigned number AC Energy generated on current day
Non Hybrid: May be imprecise
GEN24/Tauro/Verto: will always report null
YEAR_ENERGY unsigned number AC Energy generated in current year
Non Hybrid: May be imprecise
GEN24/Tauro/Verto: will always report null
TOTAL_ENERGY unsigned number AC Energy generated overall
Non Hybrid: May be imprecise
GEN24/Tauro/Verto: supported since 1.14 (updated ev-
ery 5min)
DeviceStatus object Status information about inverter
```
CommonInverterData Values which are provided by all types of Fronius inverters.


```
Value name specific data type Description
PAC integer AC power (negative value for consuming power)
SAC unsigned integer AC power (absolute)
Currently not implemented because not handled correctly
by all inverters.
GEN24/Tauro/Verto report this value
IAC unsigned number AC current (absolute, accumulated over all lines)
UAC unsigned number AC voltage
FAC unsigned number AC frequency
IDC unsigned number DC current
IDC_x unsigned number DC current of MPPT tracker x (x = 2..4; available on
GEN24/Tauro/Verto only)
UDC unsigned number DC voltage
UDC_x unsigned number DC voltage of MPPT tracker x (x = 2..4; available on
GEN24/Tauro/Verto only)
DAY_ENERGY unsigned number AC Energy generated on current day
Non Hybrid: May be imprecise
GEN24/Tauro/Verto: will always report null
YEAR_ENERGY unsigned number AC Energy generated in current year
Non Hybrid: May be imprecise
GEN24/Tauro/Verto: will always report null
TOTAL_ENERGY unsigned number AC Energy generated overall
Non Hybrid: May be imprecise
GEN24/Tauro/Verto: supported since 1.14(updated every
5min)
DeviceStatus object Status information about inverter
```
3PInverterData Values which are provided by 3phase Fronius inverters.

```
Value name specific data type Description
IAC_L1 unsigned number AC current Phase 1 (absolute)
IAC_L2 unsigned number AC current Phase 2 (absolute)
IAC_L3 unsigned number AC current Phase 3 (absolute)
UAC_L1 unsigned number AC voltage Phase 1
UAC_L2 unsigned number AC voltage Phase 2
UAC_L3 unsigned number AC voltage Phase 3
T_AMBIENT integer Ambient temperature
Most inverter like GEN24/Tauro/Verto do not provide it.
Only provided by CL, XL and IG500/400.
ROTATION_SPEED_FAN_FL unsigned integer Rotation speed of front left fan
not provided on GEN24/Tauro/Verto
ROTATION_SPEED_FAN_FR unsigned integer Rotation speed of front right fan
not provided on GEN24/Tauro/Verto
ROTATION_SPEED_FAN_BL unsigned integer Rotation speed of back left fan
not provided on GEN24/Tauro/Verto
ROTATION_SPEED_FAN_BR unsigned integer Rotation speed of back right fan
not provided on GEN24/Tauro/Verto
```
MinMaxInverterData Minimum- and Maximum-values of various inverter values.


```
object {
```
# Collection of named value - unit pairs according to selected DataCollection.
# Members of Data object are named according to the value they represent (e.g. "PAC").
**object** {

```
# Value - Unit pair.
object {
```
```
# Unscaled value.
# value name based specific data type
<specific data type > Value;
```
```
# Base unit of the value , never contains any prefixes.
string Unit;
```
```
} V A L U E _ N A M E ;
```
}* Data;
};

```
" MgmtTimerRemainingTime" : - 1,
```
```
Value name specific data type Description
DAY_PMAX unsigned integer Maximum AC power of current day
DAY_UACMAX number Maximum AC voltage of current day
DAY_UACMIN number Minimum AC voltage of current day
DAY_UDCMAX number Maximum DC voltage of current day
YEAR_PMAX unsigned integer Maximum AC power of current year
YEAR_UACMAX number Maximum AC voltage of current year
YEAR_UACMIN number Minimum AC voltage of current year
YEAR_UDCMAX number Maximum DC voltage of current year
TOTAL_PMAX unsigned integer Maximum AC power of current year
TOTAL_UACMAX number Maximum AC voltage overall
TOTAL_UACMIN number Minimum AC voltage overall
TOTAL_UDCMAX number Maximum DC voltage overall
```
#### 4.1.6 Object structure of response body (Scope ”Device”)

```
Listing 6: Object structure of response body for GetInverterRealtimeData request (Scope ”Device”)
```
#### 4.1.7 Example of response body (Scope ”Device”)

```
Listing 7: Response body for GetInverterRealtimeData scope=”Device” and collection=”CommonInverterData”
```

```
"UAC_L2 " : {
```
Listing 8: Response body for GetInverterRealtimeData scope=”Device” and collection=”3PInverterData” on Symo
Hybrid

```
" RequestArguments" : {
```

```
"UAC_L3 ": {
```
```
" RequestArguments" : {
```
Listing 9: Response body for GetInverterRealtimeData scope=”Device” and collection=”3PInverterData” on
GEN24 Symo

```
" RequestArguments" : {
```

Listing 10: Response body for GetInverterRealtimeData scope=”Device” and collection=”CommonInverterData”
on GEN24 Symo

{
"Body" : {
"Data" : {
" D A Y _ E N E R GY " : {
"Unit" : "Wh",
"Value" : **null**
},
" DeviceStatus" : {
" ErrorCode" : 0,
" InverterState" : " Running",
" StatusCode" : 7
},
"FAC" : {
"Unit" : "Hz",
"Value" : 50.
},
"IAC" : {
"Unit" : "A",
"Value" : 1.
},
"IDC" : {
"Unit" : "A",
"Value" : 0.
},
"IDC_2 " : {
"Unit" : "A",
"Value" : 0.
},
"IDC_3 " : {
"Unit" : "A",
"Value" : 0.
},
"IDC_4 " : {
"Unit" : "A",
"Value" : 0.
},
"PAC" : {
"Unit" : "W",
"Value" : 1965.
},
"SAC" : {
"Unit" : "VA",
"Value" : 1965.
},
" TO T A L_ E N E R G Y " : {
"Unit" : "Wh",
"Value" : 3120.
},
"UAC" : {
"Unit" : "V",
"Value" : 234.
},
"UDC" : {
"Unit" : "V",
"Value" : 1.
},
"UDC_2 " : {
"Unit" : "V",


{
"Body" : {
"Data" : {
" DeviceStatus:" : {
" InverterState" : " Running"
},
"PAC" : {
"Unit" : "W",
"Value" : 8.4296154682294417 e+
}
}
},
"Head" : {
" RequestArguments" : {
" Data Coll ection" : " C umulationInverter Data",
" DeviceClass" : " Inverter",
" DeviceId" : "1",
"Scope" : "Device"
},
"Status" : {
"Code" : 0,
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2019 - 08 - 28 T05 :59:13+00:00 "
}
}

Listing 11: Response body for GetInverterRealtimeData scope=”Device” and collection=”CumulationInverterData”
on GEN24 Primo

Listing 12: Response body for GetInverterRealtimeData scope=”Device” and collection=”CumulationInverterData”
on Tauro

```
" RequestArguments" : {
```

"Data" : {
" D A Y _ E N E R GY " : {
"Unit" : "Wh",
"Value" : **null**
},
" DeviceStatus" : {
" ErrorCode" : 0,
" InverterState" : " Running",
" StatusCode" : 7
},
"FAC" : {
"Unit" : "Hz",
"Value" : 50.
},
"IAC" : {
"Unit" : "A",
"Value" : 426.
},
"IDC" : {
"Unit" : "A",
"Value" : 8.
},
"IDC_2 " : {
"Unit" : "A",
"Value" : **null**
},
"IDC_3 " : {
"Unit" : "A",
"Value" : **null**
},
"IDC_4 " : {
"Unit" : "A",
"Value" : 0.
},
"PAC" : {
"Unit" : "W",
"Value" : 2941.
},
"SAC" : {
"Unit" : "VA",
"Value" : 100970.
},
" TO T A L_ E N E R G Y " : {
"Unit" : "Wh",
"Value" : 36742265.
},
"UAC" : {
"Unit" : "V",
"Value" : 236.
},
"UDC" : {
"Unit" : "V",
"Value" : 636.
},
"UDC_2 " : {
"Unit" : "V",
"Value" : **null**
},
"UDC_3 " : {
"Unit" : "V",
"Value" : **null**
},
"UDC_4 " : {
"Unit" : "V",
"Value" : 409.
},
" Y E A R_ E N E R GY " : {


```
object {
```
# Collection of named object(s) containing values per device and metadata.
# Members of Data object are named according to the value they represent (e.g. "PAC").
**object** {

```
# Value - Unit pair.
object {
```
```
# Base unit of the value , never contains any prefixes.
string Unit;
```
```
# Unscaled values per device.
# Property name is the DeviceId to which the value belongs.
object {
```
```
<specific data type > 1; # value from device with index 1.
<specific data type > 2; # value from device with index 2.
# .. and so on.
```
```
}* Values;
```
```
} V A L U E _ N A M E ;
```
```
}* Data;
```
};

#### 4.1.8 Object structure of response body (Scope ”System”)

```
Listing 13: Object structure of response body for GetInverterRealtimeData request (Scope ”System”)
```
#### 4.1.9 Example of response body (Scope ”System”)

```
Listing 14: Example of response body for GetInverterRealtimeData request (Scope ”System”)
```
```
" RequestArguments" : {
```

Listing 15: Example of response body for GetInverterRealtimeData request (Scope ”System”) on
GEN24/Tauro/Verto


```
Platform Since version
Fronius Hybrid ALWAYS
Fronius Non Hybrid ALWAYS
Fronius GEN24/Tauro/Verto ALWAYS
```
## 1& This API is useless on Fronius Hybrid systems which are unable to get connected to sensor cards

```
anyway.
```
## 1& API is available but returns an error on GEN24/Tauro/Verto.

### 4.2 GetSensorRealtimeData request

This request provides data for all channels of a single Fronius Sensor Card.
Inactive channels and channels with damaged sensors are not included in the response.

#### 4.2.1 Availability

#### 4.2.2 URL for HTTP requests

/solar_api/v1/GetSensorRealtimeData.cgi

#### 4.2.3 Parameters

```
Parameter Type Range/Values/Pattern Description
Scope String ”Device”
”System”
```
```
Query specific device(s)
or whole system
DeviceId String Solar Net: 0 ...9 Which card to query.
DataCollection String ”NowSensorData”
”MinMaxSensorData”
```
```
Selects the collection of data that should
be queried from the device.
See 4.2.4 for details.
```
#### 4.2.4 Data Collections

NowSensorData The presently measured values of every active channel.

MinMaxSensorData The minimum and maximum values for every time period (day, month, year, total) of every
channel.
Some channels do not have a minimum value because it would always be zero. For these channels, the minimum
value is not included.

#### 4.2.5 Object structure of response body (DataCollection ”NowSensorData”)

Listing 16: Object structure of response body for GetSensorRealtimeData request (DataCollection ”NowSensor-
Data”)


{
"Body" : {
"Data" : {
"0" : {
"Unit" : "°C",
"Value" : - 9
},
"1" : {
"Unit" : "°C",
"Value" : 24
},
"2" : {
"Unit" : "W/m 2 ",
"Value" : 589
},
"4" : {
"Unit" : "KWh/m 2 ",
"Value" : 0
}
}
},
"Head" : {
" RequestArguments" : {
" DataCollection" : " NowSensorData",
" DeviceClass" : " SensorCard",
" DeviceId" : "1",
"Scope" : "Device"
},
"Status" : {
"Code" : 0,
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2018 - 03 - 01 T13 :25:34+01:00 "
}
}

#### 4.2.6 Example of response body (DataCollection ”NowSensorData”)

```
Listing 17: Example of response body for GetSensorRealtimeData request (DataCollection ”NowSensorData”)
```
#### 4.2.7 Object structure of response body (DataCollection ”MinMaxSensorData”)

Listing 18: Object structure of response body for GetSensorRealtimeData request (DataCollection ”MinMaxSen-
sorData”)


```
object {
```
```
# Object r epr esenting one channel.
object {
```
```
# Whether this channel is currently active.
boolean SensorActive;
```
```
# Object r epr esenti ng min/max values of current day.
object {
```
```
# Maximum value with unit.
object {
number Value;
string Unit;
} Max;
```
```
# Minimum value with unit.
# This object is only present in temperature channels ( channel# 0 and 1)
# as other channels do not have minimum values.
object {
number Value;
string Unit;
} Min;
} Day;
```
```
# Object r epr esenti ng min/max values of current month.
object {
object {
number Value;
string Unit;
} Max;
object {
number Value;
string Unit;
} Min;
} Month;
```
```
# Object r epr esenti ng min/max values of current year.
object {
object {
number Value;
string Unit;
} Max;
object {
number Value;
string Unit;
} Min;
} Year;
```
```
# Object r epr esenting total min/max values.
object {
object {
number Value;
string Unit;
} Max;
object {
number Value;
string Unit;
} Min;
} Total;
```
```
} C H A N N E L _ I N D E X ;
```
```
}* Data;
```
};


#### 4.2.8 Example of response body (DataCollection ”MinMaxSensorData”)

Listing 19: Example of response body for GetSensorRealtimeData request (DataCollection ”MinMaxSensorData”)

```
{
"Body" : {
"Data" : {
"0" : {
"Day" : {
"Max" : {
"Unit" : "°C",
"Value" : 66
},
"Min" : {
"Unit" : "°C",
"Value" : 46
}
},
"Mont h" : {
"Max" : {
"Unit" : "°C",
"Value" : 85
},
"Min" : {
"Unit" : "°C",
"Value" : 0
}
},
" SensorActive" : true ,
"Total" : {
"Max" : {
"Unit" : "°C",
"Value" : 85
},
"Min" : {
"Unit" : "°C",
"Value" : - 35
}
},
"Year" : {
"Max" : {
"Unit" : "°C",
"Value" : 85
},
"Min" : {
"Unit" : "°C",
"Value" : 0
}
}
},
"1" : {
"Day" : {
"Max" : {
"Unit" : "°C",
"Value" : 27
},
"Min" : {
"Unit" : "°C",
"Value" : 27
}
},
"Mont h" : {
"Max" : {
"Unit" : "°C",
"Value" : 77
},
"Min" : {
```

```
" SensorActive"
"Total" : {
"Max" : {
```
(^) : **true** ,
"Unit" :
"Value" :
"°C",
187
},
"Min" : {
"Unit" :
(^)
"°C",
"Value"
}
},
"Year" : {
"Max" : {
"Unit" :
: - 35
"°C",
"Value"
},
"Min" : {
"Unit" :
: 77
"°C",
"Value"
}
}
: 27
},
"2" : {
"Day" : {
"Max" : {
"Unit" :
"W/m 2 ",
"Value"
}
},
"Mont h" : {
"Max" : {
"Unit" :
: 0
"W/m 2 ",
"Value"
}
},
" SensorActive"
"Total" : {
"Max" : {
"Unit" :
: 159
: **true** ,
"W/m 2 ",
"Value"
}
},
"Year" : {
"Max" : {
"Unit" :
: 10036
"W/m 2 ",
"Value"
}
}
},
"3" : {
"Day" : {
"Max" : {
"Unit" :
: 159
"Hz",
"Value"
}
},
"Mont h" : {
"Max" : {
"Unit" :
: 0
"Hz",
"Value"
}
},
" SensorActive"
: 0
: **false** ,


"Total" : {
"Max" : {
"Unit" : "Hz",
"Value" : 2975
}
},
"Year" : {
"Max" : {
"Unit" : "Hz",
"Value" : 0
}
}
},
"4" : {
"Day" : {
"Max" : {
"Unit" : "Hz",
"Value" : 0
}
},
"Mont h" : {
"Max" : {
"Unit" : "Hz",
"Value" : 0
}
},
" SensorActive" : **false** ,
"Total" : {
"Max" : {
"Unit" : "Hz",
"Value" : 2982
}
},
"Year" : {
"Max" : {
"Unit" : "Hz",
"Value" : 0
}
}
},
"5" : {
"Day" : {
"Max" : {
"Unit" : "A",
"Value" : 0
}
},
"Mont h" : {
"Max" : {
"Unit" : "A",
"Value" : 0
}
},
" SensorActive" : **true** ,
"Total" : {
"Max" : {
"Unit" : "A",
"Value" : 36934
}
},
"Year" : {
"Max" : {
"Unit" : "A",
"Value" : 0
}
}
}


```
Platform Since version
Fronius Hybrid ALWAYS
Fronius Non Hybrid ALWAYS
Fronius GEN24/Tauro/Verto ALWAYS
```
## 1& This API is useless on Fronius Hybrid systems which are unable to get connected to string controls

```
anyway.
```
## 1& String Control does not exist for GEN24/Tauro/Verto

```
DataCollection supported on
Non Hybrid Hybrid GEN24/Tauro/Verto
NowStringControlData YES useless YES
LastErrorStringControlData YES useless NO
CurrentSumStringControlData YES useless NO
```
### 4.3 GetStringRealtimeData request

#### 4.3.1 Availability

#### 4.3.2 URL for HTTP requests

/solar_api/v1/GetStringRealtimeData.cgi

#### 4.3.3 Parameters

```
Parameter Type Range/Values/Pattern Description
Scope String ”Device”
”System”
```
```
Query specific device
or whole system
DeviceId String Solar Net: 0 ...199 Which device to query.
DataCollection String ”NowStringControlData”
”LastErrorStringControlData”
”CurrentSumStringControlData”
```
```
Selects the collection of data that
should be queried from the device.
See 4.3.5 for details.
TimePeriod String ”Day”
”Year”
”Total”
```
```
Only needed for Collection ”Cur -
rentSumStringControlData”
For which time period the current
sums should be requested.
```
#### 4.3.4 Collection availability

#### 4.3.5 Data Collections

NowStringControlData The presently measured currents of every channels.

```
" RequestArguments": {
```
```
" UserMessage": ""
```

```
object {
```
```
# Collection of named object(s) containing values per channel and metadata.
# Members of Data object are named according to the channel index they represent (e.g.
"0").
object {
```
```
# Value - Unit pair.
object {
```
```
# Value for the channel.
number Value;
```
```
# Base unit of the value , never contains any prefixes.
string Unit;
```
```
} C H A N N E L _ I N D E X ;
```
```
}* Data;
```
};

```
" RequestArguments" : {
```
LastErrorStringControlData Information about the last error which triggered a service message.

CurrentSumStringControlData Current sums of all channels for a selected time period (day, year or total).

4.3.6 Object structure of response body (DataCollection **”NowStringControlData”** and **”CurrentSum** -
**StringControlData”)**

Listing 20: Object structure of response body for GetStringRealtimeData request (DataCollection ”NowStringCon-
trolData” and ”CurrentSumStringControlData”)

#### 4.3.7 Example of response body (DataCollection ”CurrentSumStringControlData”)

Listing 21: Example of response body for GetStringRealtimeData request (DataCollection ”CurrentSumString-
ControlData”)


{
"Body" : {
"Data" : {}
},
"Head" : {
" RequestArguments" : {
" DataCollection" : " NowStringControlData",
" DeviceClass" : " StringControl",
"Scope" : "System"
},
"Status" : {
"Code" : 0,
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2019 - 08 - 28 T07 :20:58+00:00 "
}
}

```
# Timestamp when the error was detected.
```
Listing 22: Reply body for GetStringRealtimeData DataCollection=”NowStringControlData” on
GEN24/Tauro/Verto

#### 4.3.8 Object structure of response body (DataCollection ”LastErrorStringControlData”)

Listing 23: Object structure of response body for GetStringRealtimeData request (DataCollection ”LastErrorString-
ControlData”)


#### 4.3.9 Example of response body (DataCollection ”LastErrorStringControlData”)

Listing 24: Example of response body for GetStringRealtimeData request (DataCollection ”LastErrorStringCon-
trolData”)

```
# Current sum
```

```
object {
object {
# Object r epr esenting one channel.
object {
```
```
number Value;
```
```
# Base unit of the value , never contains any prefixes.
string Unit;
```
} C H A N N E L _ I N D E X ;
} Data;
}

#### 4.3.10 Object structure of response body (DataCollection ”NowStringControlData”)

Listing 25: Object structure of response body for GetStringRealtimeData request (DataCollection ”NowStringCon-
trolData”)

```
" RequestArguments" : {
```

{
"Body" : {
"Data" : {
"1" : {
"Unit" : "A",
"Value" : 0
},
"2" : {
"Unit" : "A",
"Value" : 0
},
"3" : {
"Unit" : "A",
"Value" : 0
},
"4" : {
"Unit" : "A",
"Value" : 0
},
"5" : {
"Unit" : "A",
"Value" : 0
}
}
},
"Head" : {
" RequestArguments" : {
" DataCollection" : " NowStringControlData",
" DeviceClass" : " StringControl",
" DeviceId" : "8",
"Scope" : "Device"
},
"Status" : {
"Code" : 0,
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2019 - 06 - 13 T15 :06:57+02:00 "
}
}

```
Platform Since version
Fronius Hybrid ALWAYS
Fronius Non Hybrid ALWAYS
Fronius GEN24/Tauro/Verto ALWAYS
```
## 1& API is available but returns an error on GEN24/Tauro/Verto.

#### 4.3.11 Example of response body (DataCollection ”NowStringControlData”)

Listing 26: Example of response body for GetStringRealtimeData request (DataCollection ”NowStringControl-
Data”)

### 4.4 GetLoggerInfo request

This request provides information about the logging device which provides this API.

#### 4.4.1 Availability

#### 4.4.2 URL for HTTP requests

/solar_api/v1/GetLoggerInfo.cgi


#### 4.4.3 Object structure of response body

```
Listing 27: Object structure of response body for GetLoggerInfo request
object {
```
```
object {
```
```
# Unique ID of the logging device.
string UniqueID;
```
```
# String identifying the exact product type.
# examples: "fronius - hybrid" or "fronius - datamanager - card"
string ProductID;
```
```
# String identifying the exact hardware platform.
string PlatformID;
```
```
# Hardware version of the logging device.
string HWVersion;
```
```
# Software version of the logging device. (Major.Minor.Revision - Build)
string SWVersion;
```
```
# Name of city/ country which the user
# selected as time zone.
string TimezoneLocation/[a-zA-Z]+|/;
```
```
# Name of the selected time zone.
# May be empty if information not available.
string TimezoneName/[a-zA-Z]+|/;
```
```
# UTC offset in seconds east of UTC ,
# incl uding adjustments for daylight saving.
integer UTCOffset;
```
```
# Default language set on the logging device
# as a two letter abbreviation (e.g. "en").
# NOTE: This attribute will be REMOVED soon
string DefaultLanguage;
```
```
# Grid supply tariff
# This field is mandatory only for all Fronius Hybrid inverter
# and Fronius Non Hybrid since 3.3.3 - 1
number DeliveryFactor;
```
```
# The cash factor set on the logging device ,
# NOT the factor set on the inverters.
number CashFactor;
```
```
# Currency of cash factor set on the logging device ,
# NOT the currency set on the inverters.
string CashCurrency;
```
```
# The CO2 factor set on the logging device ,
# NOT the factor set on the inverters.
number CO2Factor;
```
```
# Unit of CO2 factor set on the logging device ,
# NOT the unit set on the inverters.
string CO2Unit;
```
```
} LoggerInfo;
```
};


{
"Body" : {
" LoggerInfo" : {
" CO2Factor" : 0.52999997138977051 ,
" CO2 Unit" : "kg",
" CashCurrency" : "EUR",
" CashFactor" : 0.11999999731779099 ,
" Defa ultLa ngua ge" : "en",
" DeliveryFactor" : 0.25 ,
" HWVersion" : "2.4 D",
" PlatformID" : "wilma",
" ProductID" : "fronius - datamanager - card",
" SWVersi on" : "3.14.1 - 2 ",
" Ti mez oneLocation" : "Paris",
" TimezoneName" : "CEST",
" UTCOffset" : 7200 ,
" UniqueID" : " 240.107620 "
}
},
"Head" : {
" Request Ar guments" : {},
"Status" : {
"Code" : 0,
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2019 - 06 - 12 T15 :31:06+02:00 "
}
}

```
Platform Since version
Fronius Hybrid ALWAYS
Fronius Non Hybrid ALWAYS
Fronius GEN24/Tauro/Verto ALWAYS
```
## 1& API is available but returns an error on GEN24/Tauro/Verto.

#### 4.4.4 Example of response body

```
Listing 28: Example of response body for GetLoggerInfo request
```
### 4.5 GetLoggerLEDInfo request

This request provides information about the LED states and colors on the device which provides this API.

#### 4.5.1 Availability

#### 4.5.2 URL for HTTP requests

/solar_api/v1/GetLoggerLEDInfo.cgi

#### 4.5.3 Object structure of response body

```
Listing 29: Object structure of response body for GetLoggerLEDInfo request
```
## 1& Item ”DefaultLanguage” will be removed soon


{
"Body" : {
"Data" : {
" Pow erLE D" : {
"Color" : "green",
"State" : "on"
},
" SolarNetLED" : {
"Color" : "green",
"State" : "on"
},
" SolarWebLED" : {
"Color" : "green",
"State" : "on"
},
" W LA NL ED " : {
"Color" : "red",
"State" : "on"
}
}
},
"Head" : {
" Request Ar guments" : {},
"Status" : {
"Code" : 0,
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2019 - 06 - 12 T15 :31:07+02:00 "
}
}

#### 4.5.4 Example of response body

```
Listing 30: Example of response body for GetLoggerLEDInfo request
```
### 4.6 GetInverterInfo request

This request provides information about all inverters that are currently being monitored by the logging device. So
this means that inverters which are currently not online are also reported by this request, provided these inverters
have been seen by the logging device within the last 24 hours.

If information about devices currently online is needed, the GetActiveDeviceInfo request should be used. This
request also provides information about device classes other than inverters.

```
} LED_NAME ;
```

```
Platform Since version
Fronius Hybrid ALWAYS
Fronius Non Hybrid ALWAYS
Fronius GEN24/Tauro/Verto ALWAYS
```
#### 4.6.1 Availability

#### 4.6.2 URL for HTTP requests

/solar_api/v1/GetInverterInfo.cgi

#### 4.6.3 Object structure of response body

```
Listing 31: Object structure of response body for GetInverterInfo request
object {
```
```
# Collection of objects with infos about one inverter ,
# mapped by inverter index.
object {
```
```
# Info about a single inverter.
# Name of object is the inverter index.
object {
```
```
# Device type of the inverter.
# GEN24 /Ta uro/Verto inverter will always report device type 1.
integer DT;
```
```
# PV power connected to this inverter (in watts).
# If none defined , default power for this DT is used.
# Will provide dc power values since GEN24 /Ta uro/V erto version 1.13.5.
integer PVPower;
```
```
# Custom name of the inverter , assigned by the customer.
# Provided since 1.18.1 - 0 on Symo Hybrid
# Will contain html encoded strings on Datamanager and Symo Hybrid
# Will contain plain utf- 8 text on GEN24 /Tauro/Verto
string CustomName;
```
```
# Whether the device shall be displayed in vi sualizations according
# to customer settings. (0 do not show; 1 show)
# visualization settings.
unsigned integer Show;
```
```
# Unique ID of the inverter (e.g. serial number).
string UniqueID;
```
```
# Error code that is currently present on inverter.
# A value of - 1 means that there is no valid error code.
integer ErrorCode;
```
```
# Status code reflecting the operational state of the inverter.
# Supported since 1.13.5 on GEN24 /Tauro/Verto , older versions report a numeric string
here.
integer StatusCode;
```
```
# Status string reflecting the operational state of the inverter.
# Only provided for GEN24 /Ta ur o/Verto since version 1.13.5
string InverterState;
```
```
} INVERTER_INDEX ;
```
```
}* Data;
```
};


#### 4.6.4 Example of response body

```
Listing 32: Example of response body for GetInverterInfo request
```
{
"Body" : {
"Data" : {
"1" : {
" C ustomNa me" : "
&#80;&#114;&#105;&#109;&#111;&#32;&#56;&#46;&#50;&#45;&#49;&#32;&#40;",
"DT" : 102 ,
" Error Cod e" : 0,
" PVPower" : 500 ,
"Show" : 1,
" Stat usCode" : 7,
" UniqueID" : "38183 "
},
"2" : {
" C ustomNa me" : "
&#80;&#114;&#105;&#109;&#111;&#32;&#53;&#46;&#48;&#45;&#49;&#32;&#50;&#48;"
,
"DT" : 86,
" Error Cod e" : 0,
" PVPower" : 500 ,
"Show" : 1,
" Stat usCode" : 7,
" UniqueID" : " 16777215 "
},
"3" : {
" C ustomNa me" : "
&#71;&#97;&#108;&#118;&#111;&#32;&#51;&#46;&#49;&#45;&#49;&#32;&#50;&#48;",
"DT" : 106 ,
" Error Cod e" : 0,
" PVPower" : 500 ,
"Show" : 1,
" Stat usCode" : 7,
" UniqueID" : "7262 "
},
"55" : {
" C ustomNa me" : "
&#71;&#97;&#108;&#118;&#111;&#32;&#51;&#46;&#48;&#45;&#49;&#32;&#40;&#53;",
"DT" : 224 ,
" Error Cod e" : 0,
" PVPower" : 500 ,
"Show" : 1,
" Stat usCode" : 7,
" UniqueID" : "100372 "
}
}
},
"Head" : {
" Request Ar guments" : {},
"Status" : {
"Code" : 0,
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2019 - 06 - 12 T15 :31:02+02:00 "
}
}

```
Listing 33: Example of response body for GetInverterInfo on GEN24/Tauro/Verto
```

```
Platform Since version
Fronius Hybrid ALWAYS
Fronius Non Hybrid ALWAYS
Fronius GEN24/Tauro/Verto ALWAYS
```
#### 4.6.5 Meaning of numerical status codes

The StatusCode Field is only reported as numerical value. The meaning of the numbers is shown in the table
below.
Value Description provided by
Datamanager and Hybridmanager GEN24/Tauro/Verto
0 - 6 Startup YES Yes
7 Running YES Yes
8 Standby YES Yes
9 Bootloading YES No
10 Error YES Yes
11 Idle No Yes
12 Ready No Yes
13 Sleeping No Yes
255 Unknown No Yes
INVALID No Yes

### 4.7 GetActiveDeviceInfo request

This request provides information about which devices are currently online.

#### 4.7.1 Availability

#### 4.7.2 URL for HTTP requests

/solar_api/v1/GetActiveDeviceInfo.cgi

```
" CustomName" : "tr-3pn - 01 ",
```
```
" PVPower" : 0,
```

```
object {
```
```
# Collection of objects with infos about one inverter ,
# mapped by inverter index.
object {
```
```
# Info about a single device.
# Name of object is the device index.
object {
```
```
# Mandatory Device type of the device.
# (only for Inverter , SensorCard or StringControl; others have - 1)
integer DT;
```
```
# Optional attribute: serialnumber
# usually supported by new Inverters , OhmPilots , Batteries and Smart Meters
string Serial;
```
```
# Channel listing for Sensor Cards
array {
string ;
} ChannelNames;
```
```
} DEVICE_INDEX ;
```
```
}* Data;
```
};

#### 4.7.3 Parameters

```
2 3 4
```
#### 4.7.4 DeviceClass is not System

```
Listing 34: Object structure of response body for GetActiveDeviceInfo request
```
```
Listing 35: Example of response body for GetActiveDeviceInfo Inverter request
```
(^2) Supported since version 3.3.4- 5
(^3) Supported since version 3.6.1- 3
(^4) Not listed and provided on GEN24/Tauro/Verto
Parameter Type Range/Values/Pattern Description
DeviceClass String ”Inverter”
”Storage”
”Ohmpilot”^3
”SensorCard”^4
”StringControl”^4
”Meter”^2
Which kind of device class to search for
active devices.
”System”^2 Uses different response format


{
"Body" : {
"Data" : {
"1" : {
" Cha nnel Na mes" : [
" Temperature 1",
" Temperature 2",
" Irradiation",
" Digital 1",
" Digital 2",
" Current"
],
"DT" : 254
},
"2" : {
" Channel Na mes" : [
" Temperature 1",
" Temperature 2",
" Irradiation",
" Digital 1",
" Digital 2",
" Current"
],
"DT" : 254
}
}
},
"Head" : {
" RequestArguments" : {
" DeviceClass" : " SensorCard"
},
"Status" : {
"Code" : 0,
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2018 - 03 - 01 T14 :41:12+01:00 "
}
}

```
Listing 36: Example of response body for GetActiveDeviceInfo SensorCard request
```
```
Listing 37: Example of response body for GetActiveDeviceInfo deviceclass=Inverter on GEN24/Tauro/Verto
```

```
object {
```
```
# Collection of objects with infos about one inverter ,
# mapped by inverter index.
object {
```
```
# name of DeviceClass
object {
```
```
# Info about a single device.
# Name of object is the device index.
object {
```
```
# Device type only for Inverter , SensorCard or StringControl. others have - 1
integer DT;
```
```
# Optional attribute: serialnumber
string Serial;
```
```
# This object only exists for SensorCard device class
array { string } ChannelNames;
```
```
} DEVICE_INDEX ;
```
```
} DEVICE_CLASS ;
```
```
}* Data;
```
};

#### 4.7.5 DeviceClass is System

```
Listing 38: Object structure of response body for GetActiveDeviceInfo request
```
```
Listing 39: Example of response body for GetActiveDeviceInfo request on non hybrid inverter systems
```
## 1& The item ’DT’ is not valid for Inverters on GEN24/Tauro/Verto


},
"55" : {
"DT" : 224
}
},
"Meter" : {
"0" : {
"DT" : - 1,
"Serial" : " 16420055 "
},
"2" : {
"DT" : - 1,
"Serial" : "475619 "
},
"3" : {
"DT" : - 1,
"Serial" : " 17362721 "
}
},
" Ohm pil ot" : {
"0" : {
"DT" : - 1,
"Serial" : " 12345678 "
}
},
" SensorCard" : {
"1" : {
" Channel Na mes" : [
" Temperature 1",
" Temperature 2",
" Irradiation",
" Digital 1",
" Digital 2",
" Current"
],
"DT" : 254
}
},
" Storage" : {},
" StringControl" : {
"3" : {
"DT" : 253
}
}
}
},
"Head" : {
" RequestArguments" : {
" Devi ceClass" : "System"
},
"Status" : {
"Code" : 0,
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2019 - 06 - 12 T15 :30:59+02:00 "
}
}

```
Listing 40: Example of response body for GetActiveDeviceInfo request on hybrid inverter systems
```

Listing 41: Example of response body for GetActiveDeviceInfo deviceclass=Inverter on GEN24/Tauro/Verto


```
Platform Since version
Fronius Hybrid ALWAYS
Fronius Non Hybrid 3.3.4- 8
Fronius GEN24/Tauro/Verto planned in 1.13
```
### 4.8 GetMeterRealtimeData request

This request provides detailed information about Meter devices. Inactive channels are not included in the re-
sponse and may vary depending on used metering device and software version. Take care about permanently or
temporary missing channels when processing this response.

#### 4.8.1 Availability

#### 4.8.2 URL for HTTP requests

/solar_api/v1/GetMeterRealtimeData.cgi

#### 4.8.3 Parameters

```
Parameter Type Range/Values/Pattern Description
Scope String ”System”
”Device”
```
```
Mandatory
```
```
DeviceId String 0..65535 Mandatory on non system scope
```
#### 4.8.4 Devicetypes and provided channels

## 1& The item ’DT’ is not valid for Inverters on GEN24/Tauro/Verto


```
Group
```
```
Model
```
```
Fronius Smart Meter Generic
```
##### 63A

##### -^3

##### 63A

##### -^1

```
50kA
```
##### -^3

##### TS

##### 100A

##### -^1

##### TS

##### 65A

##### -^3

##### TS

```
5kA
```
##### -^3

##### IP

##### WR

```
Sun
```
```
Spec
```
```
Meter
```
```
Compatibility
```
```
hw=0
```
```
and
```
```
sw=2.7
```
```
hw=1
```
```
hw=1
```
```
and
```
```
sw
```
```
is
```
##### 3.00,

##### 3.01,

##### 3.03

```
or
```
##### 3.04)

```
hw=0
```
```
and
```
```
sw=1.9
sw=1
sw=1
sw=1
all
```
```
hw
```
```
=8 and sw
```
##### =1036

```
model=307
```
```
or
```
```
model=70307
```
Channel
provided (m...mandatory, - ...never, o...optional)
Details / Manufacturer m m m m m m m m o
Details / Model m m m m m m m m o
Details / Serial m m m m m m m m o
Current_AC_Phase_1 m m m m m m m m o
Current_AC_Phase_2 m - m - m m m o o
Current_AC_Phase_3 m - m - m m m o o
Current_AC_Sum - m - m m m m m o
Enable m m m m m m m m m
EnergyReactive_VArAC_Phase_1_Consumed - m - - - - - - -
EnergyReactive_VArAC_Phase_1_Produced - m - - - - - - -
EnergyReactive_VArAC_Sum_Consumed m m m m m m - - -
EnergyReactive_VArAC_Sum_Produced m m m m m m - - -
EnergyReal_WAC_Minus_Absolute m m m m m m m m m
EnergyReal_WAC_Phase_1_Consumed - m - - - - m m o
EnergyReal_WAC_Phase_1_Produced - m - - - - m m o
EnergyReal_WAC_Phase_2_Consumed - - - - - - m o o
EnergyReal_WAC_Phase_2_Produced - - - - - - m o o
EnergyReal_WAC_Phase_3_Consumed - - - - - - m o o
EnergyReal_WAC_Phase_3_Produced - - - - - - m o o
EnergyReal_WAC_Plus_Absolute m m m m m m m m m
EnergyReal_WAC_Sum_Consumed m m m m m m m m m
EnergyReal_WAC_Sum_Produced m m m m m m m m m
Frequency_Phase_Average m m m m m m m m m
Meter_Location_Current m m m m m m m m m
PowerApparent_S_Phase_1 m m m m m m m m o
PowerApparent_S_Phase_2 m - m - m m m o o
PowerApparent_S_Phase_3 m - m - m m m o o
PowerApparent_S_Sum m m m m m m m m m
PowerFactor_Phase_1 m m m m m m m m o
PowerFactor_Phase_2 m - m - m m m o o
PowerFactor_Phase_3 m - m - m m m o o


```
PowerFactor_Sum m m m m m m m m m
PowerReactive_Q_Phase_1 m m m m m m m m o
PowerReactive_Q_Phase_2 m - m - m m m o o
PowerReactive_Q_Phase_3 m - m - m m m o o
PowerReactive_Q_Sum m m m m m m m m m
```
Some values are optional since meter is able to operate on one or three phases.

```
Group
```
```
Model
```
```
Fronius Smart Meter Generic
```
##### 63A

##### -^3

##### 63A

##### -^1

```
50kA
```
##### -^3

##### TS

##### 100A

##### -^1

##### TS

##### 65A

##### -^3

##### TS

```
5kA
```
##### -^3

##### IP

##### W

```
R Sun
```
```
Spec
```
```
Meter
```
```
Article Number
```
##### 43,0001,1473

##### 43,0001,1477

##### 43,0001,1478

##### 43,0001,0045

##### 43,0001,0044

##### 43,0001,0046

##### 42,0411,0347

##### 43,0001,35

##### 91

##### D

```
evice
```
```
dependend
```
```
PowerReal_P_Phase_1 m m m m m m m m o
PowerReal_P_Phase_2 m - m - m m m o o
PowerReal_P_Phase_3 m - m - m m m o o
PowerReal_P_Sum m m m m m m m m m
TimeStamp m m m m m m m m m
Visible m m m m m m m m m
Voltage_AC_PhaseToPhase_12 m - m - m m m o o
Voltage_AC_PhaseToPhase_23 m - m - m m m o o
Voltage_AC_PhaseToPhase_31 m - m - m m m o o
Voltage_AC_Phase_1 m m m m m m m m o
Voltage_AC_Phase_2 m - m - m m m o o
Voltage_AC_Phase_3 m - m - m m m o o
Voltage_AC_Phase_Average - - - - - - m m o
```

#### 4.8.5 Channel Descriptions

```
Name Description
Enable 1...enabled, 0...disabled
Visible 1...use values, 0...incomplete or outdated values
Current_AC_Phase_* absolute values for 63A-3,63A- 1 and 50KA- 3
only UL and TS meter provide directions
feedin negative(-); consumption positive(+)
Meter_Location_Current 0...grid interconnection point (primary meter)
1...load (primary meter)
3...external generator (secondary meters)(multiple)
256 - 511 subloads (secondary meters)(unique)
EnergyReactive_VArAC_Phase_*_Consumed/Produced
EnergyReactive_VArAC_Sum_Consumed/Produced
```
```
meter specific view
```
```
EnergyReal_WAC_Plus/Minus_Absolute system specific view
EnergyReal_WAC_Phase_*_Consumed/Produced
EnergyReal_WAC_Sum_Consumed/Produced
```
```
meter specific view
```
The values EnergyReal_WAC_Sum_Produced and EnergyReal_WAC_Sum_Consumed represent the values
for the Smart Meter itself. The values EnergyReal_WAC_Minus_Absolute and EnergyReal_WAC_Plus_Absolute
represent the values for Solar.web. Now it depends where the Smart Meter is installed (Feed-In-Point or Consumption-
Path), so that either EnergyReal_WAC_Minus_Absolute is the same as EnergyReal_WAC_Sum_Produced or
EnergyReal_WAC_Sum_Consumed.


# Collection of objects with infos about multiple Meters ,
# mapped by serial number.
**object** {

```
# list of single device objects
object {
```
```
# optional detailed information about device
# supported since:
# Fronius Symo Hybrid : with version greater than or equal to 1.1.2 - 14
# Non Fronius Symo Hybrid : with version greater than or equal to 3.3.6 - 14
object {
string Serial;
```
```
string Model;
```
```
string Manufacturer;
```
```
} Details;
```
```
# channels of device ( textual name and value)
nu m b e r * C H AN N E L _ N AM E ;
```
```
} * DeviceId;
```
} Data ;

```
" Current_AC_Phase_1 " : 0.74199999999999999 ,
" Current_AC_Phase_2 " : 0.63200000000000001 ,
```
#### 4.8.6 Meter Location Dependend Directions (primary meter)

```
Meter_Location_Current 0
feed in
```
##### 1

```
consumption path
PowerReal_P_Sum (+ positive) consuming from grid producing power
PowerReal_P_Sum (- negative) feeding in to grid normal consumption
EnergyReal_WAC_Plus_Absolute
(absolute counter)
```
```
import from grid
EnergyReal_WAC_Phase_*_Consumed
```
```
producing power *
EnergyReal_WAC_Phase_*_Produced
EnergyReal_WAC_Minus_Absolute
(absolute counter)
```
```
export to grid
EnergyReal_WAC_Phase_*_Produced
```
consumption
EnergyReal_WAC_Phase_*_Consumed
* May occur when other power generation is located in load path and producing more power than load can con-
sume.

#### 4.8.7 Meter Location Dependend Directions (secondary meter)

```
Meter_Location_Current 3
ext. generator
```
##### 256 - 511

```
subloads
PowerReal_P_Sum (+ positive) generation load is producing power
PowerReal_P_Sum (- negative) consumption normal consumption
EnergyReal_WAC_Plus_Absolute
(absolute counter)
```
```
generation
EnergyReal_WAC_Phase_*_Produced
```
```
producing power *
EnergyReal_WAC_Phase_*_Produced
EnergyReal_WAC_Minus_Absolute
(absolute counter)
```
```
consumption
EnergyReal_WAC_Phase_*_Consumed
```
```
consumption
EnergyReal_WAC_Phase_*_Consumed
```
* May occur when other power generation is located in load path and producing more power than load can con-
sume.

#### 4.8.8 System-Request

```
Listing 42: Object structure of response body for GetMeterRealtimeData request
```
```
Listing 43: Example of response body for GetMeterRealtimeData System request
```

" Current_AC_Phase_3 " : 0.65400000000000003 ,
" Details" : {
" Manufacturer" : " Fronius",
"Model" : "Smart Meter 63A",
"Serial" : " 15160189 "
},
"Enable" : 1,
" EnergyReactive_VArAC_Sum_Consumed" : 9156420 ,
" EnergyReactive_VArAC_Sum_Produced" : 87894450 ,
" EnergyReal_WAC_Minus_Absolute" : 1642802 ,
" EnergyReal_WAC_Plus_Absolute" : 19838697 ,
" EnergyReal_WAC_Sum_Consumed" : 19838697 ,
" EnergyReal_WAC_Sum_Produced" : 1642802 ,
" Frequency_Phase_Average" : 50,
" Meter_Location_Current" : 0,
" PowerApparent_S_Phase_1 " : 172.36660000000001 ,
" PowerApparent_S_Phase_2 " : 147.00319999999999 ,
" PowerApparent_S_Phase_3 " : 152.57820000000001 ,
" PowerApparent_S_Sum" : 31,
" PowerFactor_Phase_1 " : 0,
" PowerFactor_Phase_2 " : 0.97999999999999998 ,
" PowerFactor_Phase_3 " : 1,
" Pow erFa ctor_Sum" : 0.81999999999999995 ,
" PowerReactive_Q_Phase_1 " : 12.550000000000001 ,
" PowerReactive_Q_Phase_2 " : 5.8099999999999996 ,
" Pow er Reacti ve_ Q_ Phase_3 " : 0,
" PowerReactive_Q_Sum" : 18.359999999999999 ,
" PowerReal_P_Phase_1 " : 0,
" PowerReal_P_Phase_2 " : - 40.560000000000002 ,
" PowerReal_P_Phase_3 " : 15.029999999999999 ,
" PowerReal_P_Sum" : - 25.530000000000001 ,
" TimeStamp" : 1561364909 ,
" Visible" : 1,
" Voltage_AC_PhaseToPhase_12 " : 402.60000000000002 ,
" Voltage_ AC_ PhaseT oPhase_23 " : 403.5 ,
" Voltage_AC_PhaseToPhase_31 " : 403.19999999999999 ,
" Voltage_ AC_ Phase_1 " : 232.30000000000001 ,
" Voltage_ AC_ Phase_2 " : 232.59999999999999 ,
" Voltage_AC_Phase_3 " : 233.30000000000001
},
"1" : {
" Current_AC_Phase_1 " : - 0.58310449123382568 ,
" Current_AC_Phase_2 " : - 0.67854827642440796 ,
" Current_AC_Phase_3 " : - 0.7008516788482666 ,
" Current_AC_Sum" : - 1.9625044465065002 ,
" Details" : {
" Manufa ct urer " : " Fronius",
"Model" : "CCS WattNode WNC - 3D- 480 - MB",
"Serial" : "186477 "
},
"Enable" : 1,
" EnergyReal_WAC_Minus_Absolute" : 7336854 ,
" EnergyReal_WAC_Phase_1_Consumed" : 1320806 ,
" EnergyReal_WAC_Phase_1_Produced" : 1933071 ,
" EnergyReal_WAC_Phase_2_Consumed" : 158238 ,
" EnergyReal_WAC_Phase_2_Produced" : 3043466 ,
" EnergyReal_WAC_Phase_3_Consumed" : 179872 ,
" EnergyReal_WAC_Phase_3_Produced" : 2912264 ,
" EnergyReal_WAC_Plus_Absolute" : 1106969 ,
" EnergyReal_WAC_Sum_Consumed" : 1106969 ,
" EnergyReal_WAC_Sum_Produced" : 7336854 ,
" Frequency_Phase_Average" : 50.116844177246094 ,
" M et er_Location_ Curr ent" : 256 ,
" PowerApparent_S_Phase_1 " : 135.04127502441406 ,
" PowerApparent_S_Phase_2 " : 160.43267822265625 ,
" PowerApparent_S_Phase_3 " : 163.04228210449219 ,
" PowerApparent_S_Sum" : 458.5162353515625 ,


" PowerFactor_Phase_1 " : 1,
" PowerFactor_Phase_2 " : 1,
" PowerFactor_Phase_3 " : 1,
" PowerFactor_Sum" : 1,
" PowerReactive_Q_Phase_1 " : 0,
" PowerReactive_Q_Phase_2 " : 0,
" PowerReactive_Q_Phase_3 " : 0,
" PowerReactive_Q_Sum" : 0,
" PowerReal_P_Phase_1 " : - 135.04127502441406 ,
" PowerReal_P_Phase_2 " : - 160.43267822265625 ,
" PowerReal_P_Phase_3 " : - 163.04228210449219 ,
" PowerReal_P_Sum" : - 458.5162353515625 ,
" TimeStamp" : 1561364987 ,
" Visible" : 1,
" Voltage_AC_PhaseToPhase_12 " : 405.32907104492188 ,
" Voltage_AC_PhaseToPhase_23 " : 406.23068237304688 ,
" Voltage_AC_PhaseToPhase_31 " : 402.03070068359375 ,
" Voltage_ AC_ Phase_1 " : 231.59017944335938 ,
" Voltage_ AC_ Phase_2 " : 236.43516540527344 ,
" Voltage_ AC_ Phase_3 " : 232.63450622558594 ,
" Voltage_AC_Phase_Average" : 233.55328369140625
},
"2" : {
" Current_AC_Phase_1 " : 0.57899999999999996 ,
" Current_AC_Sum" : 0.57899999999999996 ,
" Details" : {
" Manufacturer" : " Fronius",
"Model " : "Smart Meter 63A-1",
"Serial" : " 15160009 "
},
"Enable" : 1,
" EnergyReactive_VArAC_Phase_1_Consumed" : 260 ,
" EnergyReactive_VArAC_Phase_1_Produced" : 8261790 ,
" EnergyReactive_VArAC_Sum_Consumed" : 260 ,
" EnergyReactive_VArAC_Sum_Produced" : 8261790 ,
" EnergyReal_WAC_Minus_Absolute" : 0,
" EnergyReal_WAC_Phase_1_Consumed" : 5670793 ,
" EnergyReal_WAC_Phase_1_Produced" : 0,
" EnergyReal_WAC_Plus_Absolute" : 5670793 ,
" EnergyReal_WAC_Sum_Consumed" : 5670793 ,
" EnergyReal_WAC_Sum_Produced" : 0,
" Frequency_Phase_Average" : 50,
" Meter_Location_Current" : 257 ,
" PowerApparent_S_Phase_1 " : 135.19 ,
" PowerApparent_S_Sum" : 135.19 ,
" Power Factor_ Phase_1 " : 0.96999999999999997 ,
" Pow erFa ctor_Sum" : 0.96999999999999997 ,
" PowerReactive_Q_Phase_1 " : - 22.629999999999999 ,
" PowerReactive_Q_Sum" : - 22.629999999999999 ,
" PowerReal_P_Phase_1 " : 132.09999999999999 ,
" PowerReal_P_Sum" : 132.09999999999999 ,
" TimeStamp" : 1561365038 ,
" Visible" : 1,
" Voltage_AC_Phase_1 " : 233.5
},
"3" : {
" Details" : {
" Manufa ct urer " : " Fronius",
"Model" : "S0 Meter at inverter 40",
"Serial" : "n.a."
},
"Enable" : 1,
" Meter_Location_Current" : 258 ,
" TimeStamp" : 1560942897 ,
" EnergyReal_WAC_Minus_Relative": 0,
" EnergyReal_WAC_Plus_Relative": 0,
" PowerReal_P_Sum": 0,


" Visible" : 1
},
"4": {
" Current_AC_Phase_1 ": 0,
" Current_AC_Phase_2 ": 0,
" Current_AC_Phase_3 ": 0,
" Current_AC_Sum": 0,
" Details": {
" Manufacturer": " Fronius",
"Model": "CCS WattNode WND - 3Y- 600 - MB",
"Serial": "475619 "
},
"Enable": 1,
" EnergyReal_WAC_Minus_Absolute": 3321 ,
" EnergyReal_WAC_Phase_1_Consumed": 3321 ,
" EnergyReal_WAC_Phase_1_Produced": 10996 ,
" EnergyReal_WAC_Phase_2_Consumed": 0,
" EnergyReal_WAC_Phase_2_Produced": 0,
" EnergyReal_WAC_Phase_3_Consumed": 0,
" EnergyReal_WAC_Phase_3_Produced": 14,
" EnergyReal_WAC_Plus_Absolute": 11010 ,
" En e r g y R e a l _ W A C _ S u m _ C o n s u m e d": 3321 ,
" EnergyReal_WAC_Sum_Produced": 11010 ,
" Freq uen cy_P hase_ Avera ge": 49.9833869934082 ,
" Meter_Location_Current": 259 ,
" PowerApparent_S_Phase_1 ": 0,
" PowerApparent_S_Phase_2 ": 0,
" PowerApparent_S_Phase_3 ": 0,
" PowerApparent_S_Sum": 0,
" PowerFactor_Phase_1 ": 1,
" PowerFactor_Phase_2 ": 1,
" PowerFactor_Phase_3 ": 1,
" PowerFactor_Sum": 1,
" PowerReactive_Q_Phase_1 ": 0,
" PowerReactive_Q_Phase_2 ": 0,
" PowerReactive_Q_Phase_3 ": 0,
" PowerReactive_Q_Sum": 0,
" PowerReal_P_Phase_1 ": 0,
" PowerReal_P_Phase_2 ": 0,
" PowerReal_P_Phase_3 ": 0,
" PowerReal_P_Sum": 0,
" TimeStamp": 1519911921 ,
" Visible": 1,
" Voltage_AC_PhaseToPhase_12 ": 238.15383911132812 ,
" Voltage_AC_PhaseToPhase_23 ": 0,
" Voltage_AC_PhaseToPhase_31 ": 232.91676330566406 ,
" Voltage_AC_Phase_1 ": 404.52679443359375 ,
" Voltage_AC_Phase_2 ": 231.70884704589844 ,
" Voltage_AC_Phase_3 ": 232.72479248046875 ,
" Voltage_AC_Phase_Average": 289.6534729003906
},
"5": {
" Current_AC_Phase_1 ": 0,
" Current_AC_Phase_2 ": 0,
" Current_AC_Phase_3 ": 0,
" Details": {
" Manufacturer": " Fronius",
"Model": "Smart Meter 50kA - 3",
"Serial": " 17362721 "
},
"Enable": 1,
" EnergyReactive_VArAC_Sum_Consumed": 34,
" EnergyReactive_VArAC_Sum_Produced": 174 ,
" EnergyReal_WAC_Minus_Absolute": 3940 ,
" EnergyReal_WAC_Plus_Absolute": 434 ,
" En e r g y R e a l _ W A C _ S u m _ C o n s u m e d": 3940 ,
" EnergyReal_WAC_Sum_Produced": 434 ,


# object with detailed infor mations about one Meter,
**object** {

```
object {
string Serial;
```
```
string Model;
```
```
string Manufacturer;
} Details;
```
```
# channels of device ( textual name and value)
nu m b e r * C H AN N E L _ N AM E ;
```
} Data ;

```
Examples for GEN24/Tauro/Verto are identical.
```
#### 4.8.9 Device-Request

```
Listing 44: Object structure of response body for GetMeterRealtimeData request
```
```
Listing 45: Example of response body for GetMeterRealtimeData Device request
```
```
" Freq uen cy_P hase_ Avera ge": 49.900000743567944 ,
```
```
" PowerApparent_S_Phase_1 ": 0,
" PowerApparent_S_Phase_2 ": 0,
" PowerApparent_S_Phase_3 ": 0,
" PowerApparent_S_Sum": 0,
" PowerFa ctor_ Phase_1 ": 0.9999999776482582 ,
" PowerFa ctor_ Phase_2 ": 0.9999999776482582 ,
" PowerFa ctor_ Phase_3 ": 0.9999999776482582 ,
" PowerFactor_Sum": 0.9999999776482582 ,
" PowerReactive_Q_Phase_1 ": 0,
" PowerReactive_Q_Phase_2 ": 0,
" PowerReactive_Q_Phase_3 ": 0,
" PowerReactive_Q_Sum": 0,
" PowerReal_P_Phase_1 ": 0,
" PowerReal_P_Phase_2 ": 0,
" PowerReal_P_Phase_3 ": 0,
" PowerReal_P_Sum": 0,
" TimeStamp": 1519911921 ,
```
```
" Voltage_AC_PhaseToPhase_12 ": 404.90001923171803 ,
" Voltage_AC_PhaseToPhase_23 ": 404.50001921271905 ,
" Voltage_AC_PhaseToPhase_31 ": 404.4000192079693 ,
" Voltage_AC_Phase_1 ": 233.70001110015437 ,
" Voltage_AC_Phase_2 ": 233.80001110490412 ,
" Voltage_AC_Phase_3 ": 233.3000110811554
```

{
"Body" : {
"Data" : {
" Current_AC_Phase_1 " : 0.61899999999999999 ,
" Current_AC_Phase_2 " : 0.68799999999999994 ,
" Current_AC_Phase_3 " : 0.55100000000000005 ,
" Details" : {
" Manufacturer" : " Fronius",
"Model" : "Smart Meter 63A",
"Serial" : " 15480258 "
},
"Enable" : 1,
" EnergyReactive_VArAC_Sum_Consumed" : 2183700 ,
" EnergyReactive_VArAC_Sum_Produced" : 47100 ,
" EnergyReal_WAC_Minus_Absolute" : 4075753 ,
" EnergyReal_WAC_Plus_Absolute" : 941840 ,
" EnergyReal_WAC_Sum_Consumed" : 941840 ,
" EnergyReal_WAC_Sum_Produced" : 4075753 ,
" Frequency_Phase_Average" : 50,
" Meter_Location_Current" : 0,
" PowerApparent_S_Phase_1 " : 143.9794 ,
" Pow er Appar ent_ S_ Phase_2 " : 159.5472 ,
" PowerApparent_S_Phase_3 " : 127.44630000000002 ,
" PowerApparent_S_Sum" : 211.36000000000001 ,
" Pow erFa ctor_ Phase_1 " : 0.97999999999999998 ,
" PowerFactor_Phase_2 " : 1,
" PowerFactor_Phase_3 " : 1,
" PowerFactor_Sum" : 1,
" PowerReactive_Q_Phase_1 " : 9.9000000000000004 ,
" Pow er Reacti ve_ Q_ Phase_2 " : 0,
" PowerReactive_Q_Phase_3 " : 4.7999999999999998 ,
" PowerReactive_Q_Sum" : 14.699999999999999 ,
" PowerReal_P_Phase_1 " : - 75,
" PowerReal_P_Phase_2 " : - 74.280000000000001 ,
" PowerReal_P_Phase_3 " : - 62.079999999999998 ,
" PowerReal_P_Sum" : - 211.36000000000001 ,
" TimeStamp" : 1560430330 ,
" Visible" : 1,
" Voltage_AC_PhaseToPhase_12 " : 402.30000000000001 ,
" Voltage_AC_PhaseToPhase_23 " : 401.10000000000002 ,
" Voltage_AC_PhaseToPhase_31 " : 401.69999999999999 ,
" Voltage_ AC_ Phase_1 " : 232.59999999999999 ,
" Voltage_ AC_ Phase_2 " : 231.90000000000001 ,
" Voltage_AC_Phase_3 " : 231.30000000000001
}
},
"Head" : {
" RequestArguments" : {
" DeviceClass" : "Meter",
" DeviceId" : "0",
"Scope" : "Device"
},
"Status" : {
"Code" : 0,
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2019 - 06 - 13 T14 :52:10+02:00 "
}
}

```
Examples for GEN24/Tauro/Verto are identical.
```
### 4.9 GetStorageRealtimeData request

This request provides detailed information about batteries. Inactive channels are not included in the response and
may vary depended on battery used and software version. Take care about permanently or temporary missing


{
"Body" : {
"Data" : {}
},
"Head" : {
" RequestArguments" : {
" DeviceClass" : " Storage",
" DeviceId" : "0",
"Scope" : "Device"
},
"Status" : {
"Code" : 255 ,
"Reason" : " battery type 'BYD' is not supported",
" UserMessage" : ""
},
" Timestamp" : "2019 - 06 - 03 T17 :01:01+02:00 "
}
}

## 1& If storage version is incompatible, it will be operative and an inconsistency warning will be shown to

```
update the storage if possible.
```
channels when processing this response.

#### 4.9.1 Availability

```
Platform
Fronius Hybrid
Fronius Non Hybrid
Fronius GEN24/Tauro/Verto
```
```
Since version
1.1.2- 13
NOT AVAILABLE
1.13
```
#### 4.9.2 3rd Party Batteries

will be displayed since HybridManager version 1.13.1-x and Solar API Version 1.5-17. Older versions reported
an error:

```
Listing 46: Former response body for GetStorageRealtimeData request using BYD Box
```
#### 4.9.3 Supported

```
manufacturer model versions
Fronius Fronius Solar Battery bms sw 0x18XX
BYD BYD Battery-Box HV protocol 0x0 - 0x1ffff
LG-Chem Resu H dcdc sw 0x5046 - 0x50ff
dcdc sw 0x7046 - 0x70ff
```
#### 4.9.4 URL for HTTP requests

/solar_api/v1/GetStorageRealtimeData.cgi

#### 4.9.5 Parameters

```
Parameter Type Range/Values/Pattern Description
Scope String ”System”
”Device”
```
```
Mandatory
```
```
DeviceId String 0..65535 Mandatory on non system scope
```
#### 4.9.6 Reference to manual

Reference to Fronius Energy Package and 3rd Party support can be found here:
https://www.fronius.com/~/downloads/Solar%20Energy/Operating%20Instructions/42%2C0426%2C0222%
2CEN.pdf


#### 4.9.7 Channel Descriptions

```
Table 3: Channel and description for control section
```
```
Name of channel Description Available
Fronius
Solar
Battery
```
##### LG

```
Chem
Resu H
```
##### BYD

```
Box
```
```
Details / Manufacturer name of manufacturer always always always
Details / Model model of battery always always always
Details / Serial unique identification serial always always always
TimeStamp last timestamp data has been refrehsed always always always
Enable device is managed (1.0) or disconnected (0.0) always always always
StateOfCharge_Relative relative charged capacity in % always always always
Capacity_Maximum current max capacity always always always
DesignedCapacity max designed capacity always always always
Current_DC battery output current (+ charging) always always always
Voltage_DC battery output voltage always always always
Temperature_Cell temperature in degree celsius always always always
```
```
Table 4: Channel and description for module section (only Solar Battery provides module informations)
```
```
Name of channel Description Available
Fronius
Solar
Battery
```
##### LG

```
Chem
Resu H
```
##### BYD

```
Box
```
```
Details / Manufacturer manufacturer always - -
Details / Model model identifier always - -
Details / Serial unique identifier always - -
Capacity_Maximum always - -
Current_DC always - -
CycleCount_BatteryCell always - -
DesignedCapacity always - -
Enable always - -
StateOfCharge_Relative always - -
Status_BatteryCell always - -
Temperature_Cell always - -
Temperature_Cell_Maximum always - -
Temperature_Cell_Minimum always - -
TimeStamp always - -
Voltage_DC always - -
Voltage_DC_Maximum_Cell always - -
Voltage_DC_Minimum_Cell always - -
```
#### 4.9.8 System-Request

```
Listing 47: Object structure of response body for GetStorageRealtimeData request
```

```
Table 2: Channel and value description
```
Name of channel Description
Status_BatteryCell Fronius Solar Battery at section Modules

```
Previuos and current state of a battery cell. One Byte printed
in hexadecimal. 0xYX (Y: Current status, X: Previous status)
Meaning of numerical status codes:
```
Status_BatteryCell for LG-Chem Resu H at section Controller

Status_BatteryCell for BYD Box at section Controller

```
Status value Description
```
(^016) RESERVED
(^116) Pre Charge
(^216) Initial
(^316) Normal Charge
(^416) Charge Terminate
(^516) Normal Discharge
(^616) Over Voltage
(^716) Over Discharge
(^816) RESERVED
(^916) Over Temp Charge
A 16 Over Current Charge
B 16 Over Temp Discharge
C 16 Over Current Discharge
D 16 Cell Unbalance
E 16 Charge Suspend
F 16 RESERVED
Status value Description
1 STANDBY
3 ENABLED
5 FAULTED
10 SLEEP
Status value Description
0 STANDBY
1 INACTIVE
2 DARKSTART
3 ACTIVE
4 FAULT
5 UPDATING


Manufacturer has been updated at version HM-1.12.1-X from ”Fronius International” to ”Fronius”

```
Listing 48: Reply body for GetStorageRealtimeData System request (Solar Battery)
```
```
" Capacity_Maximum" : 7200 ,
" Current_DC" : 1.1200000000000001 ,
```
```
" Voltage_DC" : 318.80000000000001 ,
" Voltage_DC_Maximum_Cell" : 3.3290000000000002 ,
" Voltage_DC_Minimum_Cell" : 3.3159999999999998
```

"Serial" : " S012002885 "
},
"Enable" : 1,
" StateOfChar ge_ Relative" : 55,
" Status_BatteryCell" : 53,
" T emperat ure_ Cell" : 27.25 ,
" Temperature_Cell_Maximum" : 27.75 ,
" Temperature_Cell_Minimum" : 26.950000000000045 ,
" TimeStamp" : 1560346263 ,
" Voltage_DC" : 53.142000000000003 ,
" Voltage_DC_Maximum_Cell" : 3.3239999999999998 ,
" Voltage_DC_Minimum_Cell" : 3.3140000000000001
},
{
" Ca pa city_ Maxi mum" : 1200 ,
" Current_DC" : 1.1200000000000001 ,
" CycleCount_BatteryCell" : 257 ,
" Designed Ca pacity" : 1200 ,
" Details" : {
" Manufa ct urer " : "Sony",
"Model" : " unknown",
"Serial" : " S012002843 "
},
"Enable" : 1,
" StateOfChar ge_ Relative" : 55,
" Status_BatteryCell" : 53,
" Temperature_Cell" : 26.650000000000034 ,
" Temperature_Cell_Maximum" : 27.150000000000034 ,
" Temperature_Cell_Minimum" : 26.350000000000023 ,
" TimeStamp" : 1560346263 ,
" Voltage_DC" : 53.137 ,
" Voltage_DC_Maximum_Cell" : 3.3279999999999998 ,
" Voltage_DC_Minimum_Cell" : 3.3159999999999998
},
{
" Ca pa city_ Maxi mum" : 1200 ,
" Current_DC" : 1.1299999999999999 ,
" CycleCount_BatteryCell" : 257 ,
" Designed Ca pacity" : 1200 ,
" Details" : {
" Manufa ct urer " : "Sony",
"Model" : " unknown",
"Serial" : " S012002844 "
},
"Enable" : 1,
" StateOfChar ge_ Relative" : 55,
" Status_BatteryCell" : 53,
" Temperature_Cell" : 26.450000000000045 ,
" Temperature_Cell_Maximum" : 27.050000000000011 ,
" Temperature_Cell_Minimum" : 26.25 ,
" TimeStamp" : 1560346263 ,
" Voltage_DC" : 53.164000000000001 ,
" Voltage_DC_Maximum_Cell" : 3.3290000000000002 ,
" Voltage_DC_Minimum_Cell" : 3.319
},
{
" Ca pa city_ Maxi mum" : 1200 ,
" Current_DC" : 1.1299999999999999 ,
" CycleCount_BatteryCell" : 254 ,
" Designed Ca pacity" : 1200 ,
" Details" : {
" Manufa ct urer " : "Sony",
"Model" : " unknown",
"Serial" : " S012002838 "
},
"Enable" : 1,
" StateOfChar ge_ Relative" : 55,


" Status_BatteryCell" : 53,
" Temperature_Cell" : 26.150000000000034 ,
" Temperature_Cell_Maximum" : 26.75 ,
" Temperature_Cell_Minimum" : 25.75 ,
" TimeStamp" : 1560346263 ,
" Voltage_DC" : 53.158999999999999 ,
" Voltage_DC_Maximum_Cell" : 3.3290000000000002 ,
" Voltage_DC_Minimum_Cell" : 3.3180000000000001
},
{
" Ca pa city_ Maxi mum" : 1200 ,
" Current_DC" : 1.1200000000000001 ,
" CycleCount_BatteryCell" : 256 ,
" Designed Ca pacity" : 1200 ,
" Details" : {
" Manufa ct urer " : "Sony",
"Model" : " unknown",
"Serial" : " S012002884 "
},
"Enable" : 1,
" StateOfChar ge_ Relative" : 55,
" Status_BatteryCell" : 53,
" Temperature_Cell" : 25.550000000000011 ,
" Temperature_Cell_Maximum" : 26.150000000000034 ,
" Temperature_Cell_Minimum" : 25.350000000000023 ,
" TimeStamp" : 1560346263 ,
" Voltage_DC" : 53.146000000000001 ,
" Voltage_DC_Maximum_Cell" : 3.3260000000000001 ,
" Voltage_DC_Minimum_Cell" : 3.3170000000000002
},
{
" Ca pa city_ Maxi mum" : 1200 ,
" Current_DC" : 1.1200000000000001 ,
" CycleCount_BatteryCell" : 255 ,
" Designed Ca pacity" : 1200 ,
" Details" : {
" Manufa ct urer " : "Sony",
"Model" : " unknown",
"Serial" : " S012002857 "
},
"Enable" : 1,
" StateOfChar ge_ Relative" : 55,
" Status_BatteryCell" : 53,
" T emperat ure_ Cell" : 25.25 ,
" Temperature_Cell_Maximum" : 25.75 ,
" Temperature_Cell_Minimum" : 24.950000000000045 ,
" TimeStamp" : 1560346263 ,
" Voltage_DC" : 53.156999999999996 ,
" Voltage_DC_Maximum_Cell" : 3.3260000000000001 ,
" Voltage_DC_Minimum_Cell" : 3.3199999999999998
}
]
}
}
},
"Head" : {
" RequestArguments" : {
" DeviceClass" : " Storage",
"Scope" : "System"
},
"Status" : {
"Code" : 0,
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2019 - 06 - 12 T15 :31:12+02:00 "
}


{
"Body" : {
"Data" : {
"0" : {
" Controller" : {
" Capacity_Maximum" : 11520 ,
" Current_DC" : 0,
" DesignedCapacity" : 11520 ,
" Details" : {
" Manufa ct urer " : "BYD",
"Model" : "BYD Battery - Box HV",
"Serial" : " 400481708 - 00059 "
},
"Enable" : 1,
" StateOfCharge_Relative" : 4.7000000000000002 ,
" Status_BatteryCell" : 3,
" Temperature_Cell" : 23.949999999999999 ,
" TimeStamp" : 1560430543 ,
" Voltage_DC" : 462.60000000000002
},
" Mod ules" : []
}
}
},
"Head" : {
" RequestArguments" : {
" DeviceClass" : " Storage",
"Scope" : "System"
},
"Status" : {
"Code" : 0,
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2019 - 06 - 13 T14 :55:44+02:00 "
}
}

```
Listing 49: Reply body for GetStorageRealtimeData System request (BYD B-Box)
```
#### 4.9.9 Device-Request

```
Listing 50: Object structure of response body for GetStorageRealtimeData request
```

{
"Body" : {
"Data" : {
" Controller" : {
" Capacity_Maximum" : 9800 ,
" Current_DC" : 0.90000000000000002 ,
" Designed Ca pacity" : 9800 ,
" Details" : {
" Manufacturer" : "LG-Chem",
"Model" : "Resu H",
"Serial" : " 1706179036 "
},
"Enable" : 1,
" StateOfChar ge_ Relative" : 56,
" Status_BatteryCell" : 3,
" Temperature_Cell" : 27.550000000000001 ,
" TimeStamp" : 1560346267 ,
" Voltage_DC" : 407.5
},
" Mod ules" : []
}
},
"Head" : {
" RequestArguments" : {
" DeviceClass" : " Storage",
" DeviceId" : "0",
"Scope" : "Device"
},
"Status" : {
"Code" : 0,
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2019 - 06 - 12 T15 :31:08+02:00 "
}
}

```
Platform Since version
Fronius Hybrid 1.6.1- 4
Fronius Non Hybrid 3.8.1- 4
Fronius GEN24/Tauro/Verto 1.13
```
```
Listing 51: Reply body for GetStorageRealtimeData Device request (LG Chem Resu H)
```
### 4.10 GetOhmPilotRealtimeData request

This request provides detailed information about Ohmpilot. Inactive channels are not included in the response
and may vary depending on hardware and software version used. Take care about permanently or temporary
missing channels when processing this response.

#### 4.10.1 Availability


# object with detailed i nfor mations about all Ohmpilots ,
**object** {

```
object {
```
```
object {
# serial number of device
string Serial;
```
```
# e.g. " Ohmpilot"
string Model;
```
```
# e.g. " Fronius"
string Manufacturer;
```
```
# software version
string Software;
```
```
# hardware version
string Hardware;
} Details;
```
```
# total consumed energy [Wh]
number Ene rgy Re al_ W AC _ Sum_C ons u me d;
```
```
# CodeOfState Values:
# 0 ... up and running
# 1 ... keep minimum temperature
# 2 ... legionella protection
# 3 ... critical fault
# 4 ... fault
# 5 ... boost mode
number CodeOfState;
```
```
# refer to Ohmpilot manual
# optional field
number CodeOfError;
```
```
# actual power consumption [W]
number PowerReal_PAC_Sum;
```
```
# temperature from sensor [°C]
number Temperature_Channel_1 ;
```
```
} * Ohmpilot;
```
} Data ;

#### 4.10.2 URL for HTTP requests

/solar_api/v1/GetOhmPilotRealtimeData.cgi

#### 4.10.3 Parameters

```
Parameter Type Range/Values/Pattern Description
Scope String ”System”
”Device”
```
```
Mandatory
```
```
DeviceId String 0..65535 Mandatory on non system scope
```
#### 4.10.4 Reference to manual

https://www.fronius.com/~/downloads/Solar%20Energy/Operating%20Instructions/42%2C0410%2C2141.pdf

#### 4.10.5 System-Request

```
Listing 52: Object structure of response body for GetOhmPilotRealtimeData System request
```

{
"Body" : {
"Data" : {
"0" : {
" CodeOfError" : 926 ,
" CodeOfState" : 0,
" Details" : {
" Hardware" : "3",
" Manufa ct urer " : " Fr onius",
"Model" : " Ohmpilot",
"Serial" : " 28136344 ",
" Software" : "1.0.19 - 1 "
},
" EnergyReal_WAC_Sum_Consumed" : 2964307 ,
" PowerReal_PAC_Sum" : 0,
" Temperature_Channel_1 " : 23.899999999999999
}
}
},
"Head" : {
" RequestArguments" : {
" Devi ceClass" : " OhmPi lot",
"Scope" : "System"
},
"Status" : {
"Code" : 0,
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2019 - 06 - 24 T10 :10:44+02:00 "
}
}

```
# hardware version
```
```
Listing 53: Reply body for GetOhmPilotRealtimeData System request
```
#### 4.10.6 Device-Request

```
Listing 54: Object structure of response body for GetOhmPilotRealtimeData Device request
```

{
"Body" : {
"Data" : {
" CodeOfError" : 926 ,
" CodeOfState" : 0,
" Details" : {
" Hardware" : "3",
" Manufa ct urer " : " Fr onius",
"Model" : " Ohmpilot",
"Serial" : " 28136344 ",
" Software" : "1.0.19 - 1 "
},
" EnergyReal_WAC_Sum_Consumed" : 2964307 ,
" PowerReal_PAC_Sum" : 0,
" Temperature_Channel_1 " : 23.899999999999999
}
},
"Head" : {
" RequestArguments" : {
" Devi ceClass" : " OhmPi lot",
" DeviceId" : "0",
"Scope" : "Device"
},
"Status" : {
"Code" : 0,
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2019 - 06 - 24 T10 :10:41+02:00 "
}
}

```
Platform Since version
Fronius Hybrid 1.2.1-X
Fronius Non Hybrid 3.3.9-X
Fronius GEN24/Tauro/Verto ALWAYS
```
```
Listing 55: Reply body for GetOhmPilotRealtimeData Device request
```
### 4.11 GetPowerFlowRealtimeData request

This request provides detailed information about the local energy grid. The values replied represent the current
state. Because data has multiple asynchronous origins it is a matter of fact that the sum of all powers (grid, load
and generate) will differ from zero.
This request does not care about the configured visibility of single inverters. All inverters are reported. Same for
batteries.

#### 4.11.1 Availability

```
# actual power consumption [W]
```
```
number Temperature_Channel_1 ;
```

```
# mandatory field
```
```
# mandatory field
```
```
# mandatory field
```
```
# mandatory field
```
#### 4.11.2 Version......................................................................................................................................................

This request is only a gateway to internal generated data containers. Please take care about the ”Version” field
in the response. Newer versions usually contain all previous items.
Version Changes
10 added smartloads/ohmpilot
added Version field
11 added secondary meters for subloads or extra production (Datamanager and HybridManager)
12 inverter nodes now provide component id
added secondary meters for subloads or extra production (GEN24/Tauro/Verto only)
added active power and apparent current per phase for primary meter
13 added OhmpilotEcos entry to Smartloads (GEN24/Tauro/Verto only)

#### 4.11.3 URL for HTTP requests

/solar_api/v1/GetPowerFlowRealtimeData.fcgi

```
Please note, for performance reasons the URL extension is different to other Solar API requests.
```
#### 4.11.4 Parameters

There are no parameters. Only one type of query exists.

#### 4.11.5 Request

```
Listing 56: Object structure of response body for GetPowerFlowRealtimeData request
```

```
number P_Load;
```
```
# mandatory field
# this value is null if no battery is active ( - charge , + discharge )
number P_Akku;
```
```
# mandatory field
# this value is null if inverter is not running ( + production ( default ) )
# On GEN24 and SymoHybrid: reports production on DC side (PV generator).
# On SnapInverter: is ident to power generated on AC side (ac power output).
number P_PV;
```
```
# mandatory field
# available since Fronius Hybrid version 1.3.1 - 1
# available since Fronius Non Hybrid version 3.7.1 - 2
# current relative self consumption in %, null if no smart meter is connected
number rel_SelfConsumption;
```
```
# mandatory field
# available since Fronius Hybrid version 1.3.1 - 1
# available since Fronius Non Hybrid version 3.7.1 - 2
# current relative autonomy in %, null if no smart meter is connected
number rel_Autonomy;
```
```
# optional field
# "load ", "grid" or " unknown" (during backup power)
string Meter_Location;
```
```
# optional field
# implemented since Fronius Non Hybrid version 3.4.1 - 7
# this value is always null on GEN24 /Ta uro/Ver to
# AC Energy [Wh] this day , null if no inverter is connected
number E_Day;
```
```
# optional field
# implemented since Fronius Non Hybrid version 3.4.1 - 7
# this value is always null on GEN24 /Ta uro/Ver to
# AC Energy [Wh] this year, null if no inverter is connected
number E_Year;
```
```
# optional field
# implemented since Fronius Non Hybrid version 3.4.1 - 7
# implemented since Fronius GEN24 /Tauro/Verto version 1.14 and null before
# updated only every 5 minutes on GEN24 /Ta ur o/Vert o.
# AC Energy [Wh] ever since , null if no inverter is connected
number E_Total;
```
} Site;

**object** {

```
object {
```
```
# mandatory field
# device type of inverter
# GEN24 / Ta uro/Verto do report 1
integer DT;
```
```
# mandatory field
# current power in Watt, null if not running (+ produce/export , - consume/
import)
# This is power generated on AC side (ac power output).
integer P;
```
```
# optional field
# current state of charge in % as decimal ( 5.3% ) or integer (0 - 100%)
unsigned number SOC;
```

```
# mandatory field
# implemented since Fronius Non Hybrid version 3.13.1 - 1
# Fronius Hybrid version 1.11.1 - 1
# PowerFlowVersion 12
# component identification (8 bit group , 16 bit enum)
unsigned integer CID;
```
```
# optional field
# " disabled", "normal", " service", "charge boost",
# "nearly depleted", " suspended", " calibrate",
# "grid support", " deplete recovery", "non operable ( voltage)",
# "non operable ( temperature)", " preheating", " startup",
# " stopped ( temperat ure)", " battery full"
string Battery_Mode;
```
```
# optional field
# implemented since Fronius Non Hybrid version 3.7.1 - 1
# Fronius Hybrid version 1.3.1 - 1
# Fronius GEN24 /Ta uro/Verto always null
# AC Energy [Wh] this day , null if no inverter is connected
number E_Day;
```
```
# optional field
# implemented since Fronius Non Hybrid version 3.7.1 - 1
# Fronius Hybrid version 1.3.1 - 1
# Fronius GEN24 /Ta uro/Verto always null
# AC Energy [Wh] this year, null if no inverter is connected
number E_Year;
```
```
# optional field
# implemented since Fronius Non Hybrid version 3.7.1 - 1
# Fronius Hybrid version 1.3.1 - 1
# Fronius GEN24 /Tauro/Verto version 1.14 and null before
# updated only every 5 minutes on GEN24 /Tauro/Verto.
# AC Energy [Wh] ever since , null if no inverter is connected
number E_Total;
```
```
} * Devi ceId ; # SolarNet ring address ("1" on hybrid systems)
# GEN24 /Tauro/Verto devices always will use DeviceId 1
```
} Inverters;

# optional field
# implemented since Fronius Non Hybrid version 3.8.1 - 1
# Fronius Hybrid version 1.6.1 - 1
# PowerFlowVersion 10
**object** {

```
# optional field
# implemented since PowerFlowVersion 10
# always available on GEN24 /Tauro/Verto
# on DM/HM only available when Ohmpilot is existing
object {
```
```
# optional field
# implemented since PowerFlowVersion 10
object {
```
```
# mandatory field
# implemented since PowerFlowVersion 10
# current power consumption in Watt
number P_AC_Total;
```
```
# mandatory field
# implemented since PowerFlowVersion 10
```

```
# operating state "normal", "min - temperature", "legionella - protection",
# "fault", " warning" or "boost"
string State;
```
```
# mandatory field
# implemented since PowerFlowVersion 10
# temperature of storage / tank in degree Celsius
number Temperature;
```
```
} ComponentId;
```
```
} Ohmpilots;
```
```
# optional field
# implemented since PowerFlowVersion 13
# Fronius GEN24 /Tauro/Verto version 1.33.1
# always available on GEN24 /Ta uro/Verto
# not available on DM/HM
object {
```
```
# optional field
# implemented since PowerFlowVersion 13
object {
```
```
# mandatory field
# implemented since PowerFlowVersion 13
# current power consumption of OhmpilotEco in Watt
number P_AC_Total;
```
```
# mandatory field
# implemented since PowerFlowVersion 13
# current operating state of heating rod 1: "normal",
# "min - temperature", "legionella - protection", "fault", " warning",
# "boost", "target - temperature", "max - temperature"
# or " timeschedule"
string State_HR1 ;
```
```
# mandatory field
# implemented since PowerFlowVersion 13
# current operating state of heating rod 2: "normal",
# "min - temperature", "legionella - protection", "fault", " warning",
# "boost", "target - temperature", "max - temperature"
# or " timeschedule"
string State_HR2 ;
```
```
# mandatory field
# implemented since PowerFlowVersion 13
# current temperature of heating rod 1 in degree Celsius
number Temperature_1 ;
```
```
# mandatory field
# implemented since PowerFlowVersion 13
# current temperature of heating rod 2 in degree Celsius
number Temperature_2 ;
```
```
} ComponentId;
```
```
} OhmpilotEcos;
```
} Smartloads;

# optional field
# implemented since Fronius Non Hybrid version 3.12.1 - 1
# Fronius Hybrid version 1.10.1 - 1
# PowerFlowVersion 11
#
# Fronius GEN24 /Tauro/Verto 1.22.1 - 1


## 1& On GEN24/Tauro/Verto devices having no battery the fields ”SOC”=0.0 and ”Battery_Mode”=”disabled”

```
are falsely reported until 1.17.x.
```
Reference to device type table in section 6.2.
Reference to meter location table in section 6.5.

```
Listing 57: Reply body for GetPowerFlowRealtimeData on Fronius Hybrid System
```
```
PowerFlowVersion 13
```
```
# implemented since PowerFlowVersion 11
```
```
# mandatory field
# implemented since PowerFlowVersion 11
```
```
# mandatory field
# implemented since PowerFlowVersion 11
```
```
number MLoc;
```
```
# mandatory field
# implemented since PowerFlowVersion 11
```
```
# mandatory field
# implemented since PowerFlowVersion 11
# category token
#
#
# " METER_CAT_PV_BAT"
#
# " METER_CAT_BHKW"
# " METER_CAT_ECAR"
# "
#
# " METER_CAT_PUMP"
#
# " METER_CAT_CLIMATE"
# " METER_CAT_BUILDING"
# "
```

Listing 58: Reply body for GetPowerFlowRealtimeData on Fronius Non Hybrid System

```
" rel_Autonomy" : 100 ,
```

Category"

Listing 59: Reply body for GetPowerFlowRealtimeData on GEN24 Primo


Listing 60: Reply body for GetPowerFlowRealtimeData on Tauro


```
Platform Since version
Fronius Hybrid 1.1.2- 16
Fronius Non Hybrid 3.3.4- 5
Fronius GEN24/Tauro/Verto NEVER
```
## 1& GEN24/Tauro/Verto does not provide access to history data

## 1& On days where daylight saving time is changing (begin or end of summertime) a few problems are

```
known regarding time calculation.
```
## 5 Archive Requests

### 5.1 Common

Archive requests shall be provided whenever access to historic device-data is possible and it makes sense to
provide such a request.
Of course, the Datalogger Web can only provide what is stored in its internal memory and has not been overwritten
by newer data yet. It can loose data, due to capacity reason. The number of days stored is dependent on the
number of connected units to log. This limitation is not present for Solar.web, provided that the Datalogger has
reliably uploaded the data.

Different from what is specified within the previously released drafts, there is only one CGI to access all historic
data. This CGI contains detailed, summed, error and events queries.

```
Call is http://<insert hostname or IP here>/solar_api/v1/GetArchiveData.cgi?<your query parameters>
```
```
The number of parallel queries is system wide restricted to 4 clients.
```
#### 5.1.1 Availability

#### 5.1.2 ChannelId

Each channel is handled and requested by name. Most of the channels are recorded in constant cyclic intervals
which can be set between 5 and 30 minutes. Only _Digital_ _ _PowerManagementRelay_ _ _Out_ _ _∗_ , _InverterErrors_ ,
_InverterEvents_ and _Hybrid_ _ _Operating_ _ _State_ are event triggered and may occure every time.
5

(^5) introduced in Solar API CompatibilityRange Version 1.5- 10 (Datamanager 3.11.1 or Hybridmanager 1.9.1)

## 1& Energies are not provided and device types DT are invalid on GEN24/Tauro/Verto


```
Table 5: Available channels
```
(^6) Not implemented on inverters.
Name Unit
TimeSpanInSec
EnergyReal_WAC_Sum_Produced
EnergyReal_WAC_Sum_Consumed^6
InverterEvents
InverterErrors
Current_DC_String_1
Current_DC_String_2
Voltage_DC_String_1
Voltage_DC_String_2
Temperature_Powerstage
Voltage_AC_Phase_1
Voltage_AC_Phase_2
Voltage_AC_Phase_3
Current_AC_Phase_1
Current_AC_Phase_2
Current_AC_Phase_3
PowerReal_PAC_Sum
sec
Wh
Wh
struct
struct
1A
1A
1V
1V
deg C
1V
1V
1V
1A
1A
1A
1W
EnergyReal_WAC_Minus_Absolute
EnergyReal_WAC_Plus_Absolute
Meter_Location_Current
1Wh
1Wh
1
Temperature_Channel_1
Temperature_Channel_2
Digital_Channel_1
Digital_Channel_2
Radiation

##### 1

##### 1

##### 1

##### 1

##### 1

```
Digital_PowerManagementRelay_Out_1
Digital_PowerManagementRelay_Out_2
Digital_PowerManagementRelay_Out_3
Digital_PowerManagementRelay_Out_4
```
##### 1

##### 1

##### 1

##### 1

```
Hybrid_Operating_State 1
```

#### 5.1.3 Parameters

```
Scope String ”Device”
”System”
```
```
Query specific device(s) or whole system.
Mandatory
SeriesType String ”DailySum”
”Detail” (default)
```
```
Resolution of the data-series. Optional
```
```
HumanReadable BoolString ”True” (default)
”False”
```
```
Unset/Set readable output. Optional
```
```
StartDate DateString ”21.5.[20]14”
”5/21/[20]14”
”[20]14- 5 - 21”
”2011- 10 -
20T10:09:14+02:00”
```
```
Mandatory
supplying only the date will be interpreted as
local time
```
```
EndDate DateString ”21.5.[20]14”
”5/21/[20]14”
”[20]14- 5 - 21”
”2011- 10 -
20T10:09:14Z”
```
```
Mandatory
```
```
Channel String available channels from table 5. Mandatory, multiple times
DeviceClass String ”Inverter”
”SensorCard”
”StringControl”
```
```
Which kind of device will be queried. Manda-
tory and accepted only if Scope is not ”Sys -
tem”
DeviceClass ”Meter”
”Storage”
”OhmPilot”
```
```
since DM 3.7.4- 6 HM 1.3.1- 1
since DM 3.7.4- 6 HM 1.3.1- 1
since DM 3.8.1- 4 HM 1.6.1- 4
DeviceId String Solar Net: 0 ...199 Only needed for Scope ”Device”
Which device to query.
This parameter can be given more than once,
thus specifying a list of devices to query.
```
#### 5.1.4 Object Structure of response body

```
Listing 61: Object structure of request body
```

// / solar_api/v1/ GetArchiveData.cgi?Scope=System& StartDate=1.3.2018& EndDate=1.3.2018&
Channel=TimeSpanInSec& Channel=EnergyReal_WAC_Plus_Absolute& Channel=
EnergyReal_WAC_Minus_Absolute& Channel=Meter_Location_Current

```
" TimeSpanInSec" :
```
```
" _comment" : " channelId =65549 "
```
### 5.2 Example of response body

#### 5.2.1 Meter data

```
Listing 62: detailed response body for meter data
```

" NodeType" : 97,
"Start" : "2018 - 03 - 01 T00 :00:00+01:00 "
},
"meter:15480258 " :
{
"Data" :
{
" EnergyReal_WAC_Minus_Absolute" :
{
"Unit" : "Wh",
"Values" :
{
"0" : 744657 ,
"10200 " : 744657 ,
"10500 " : 744657 ,
/* shorten list for readability */
"9300 " : 744657 ,
"9600 " : 744657 ,
"9900 " : 744657
},
" _comment" : " channelId =167837960 "
},
" EnergyReal_WAC_Plus_Absolute" :
{
"Unit" : "Wh",
"Values" :
{
"0" : 605047 ,
"10200 " : 605194 ,
"10500 " : 605198 ,
"10800 " : 605202 ,
/* shorten list for readability */
"9000 " : 605177 ,
"9300 " : 605181 ,
"9600 " : 605185 ,
"9900 " : 605190
},
" _comment" : " channelId =167772424 "
},
" Meter_Locati on_C urre nt" :
{
"Unit" : "1",
"Val ues" :
{
"0" : 0,
"10200 " : 0,
"10500 " : 0,
"10800 " : 0,
/* shorten list for readability */
"9600 " : 0,
"9900 " : 0
},
" _comment" : " channelId =117050390 "
}
},
"End" : "2018 - 03 - 01 T23 :59:59+01:00 ",
"Start" : "2018 - 03 - 01 T00 :00:00+01:00 "
}
}
},
"Head" :
{
" RequestArguments" :
{
" Channel" :
[
" TimeSpanInSec",


// / solar_api/v1/ GetArchiveData.cgi?Scope=System& StartDate=1.3.2018& EndDate=1.3.2018&

```
" _comment" : " channelId =67830024 "
```
```
" NodeType" : 120 ,
```
#### 5.2.2 Inverter data

```
Listing 63: detailed response body with multiple inverters
```
```
" EnergyReal_WAC_Minus_Absolute",
```
```
" HumanReadable" : "True",
```

// / solar_api/v1/ GetArchiveData.cgi?Scope=System& StartDate=1.3.2018& EndDate=2.3.2018&

{
" En e rg y Re a l_ W A C _ S u m _ P r o d u ce d" :
{
"Unit" : "Wh",
"Values" :
{
"39900 " : 319.23555555555555 ,
/* shorten list for readability */
"85200 " : 0,
"85500 " : 0,
"85800 " : 0,
"86100 " : 0
},
" _comment" : " channelId =67830024 "
}
},
" DeviceType" : 192 ,
"End" : "2018 - 03 - 01 T23 :59:59+01:00 ",
" NodeType" : 121 ,
"Start" : "2018 - 03 - 01 T00 :00:00+01:00 "
}
}
},
"Head" :
{
" RequestArguments" :
{
" Channel" :
[
" EnergyReal_WAC_Sum_Produced",
" EnergyReal_WAC_Sum_Consumed"
],
" EndDate" : "2018 - 03 - 01 T23 :59:59+01:00 ",
" HumanReadable" : "True",
"Scope" : "System",
" SeriesType" : "Detail",
" StartDate" : "2018 - 03 - 01 T00 :00:00+01:00 "
},
"Status" :
{
"Code" : 0,
" ErrorDetail" :
{
"Nod es" : []
},
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2018 - 03 - 02 T09 :49:51+01:00 "
}
}

#### 5.2.3 Errors - Structure

```
Listing 64: Example of response body for inverter errors
```

// / solar_api/v1/ GetArchiveData.cgi?Scope=System& StartDate=2.3.2018& EndDate=2.3.2018&

#### 5.2.4 Events - Structure

```
Listing 65: Example of response body for inverter events
```
```
" _comment": " channelId =16646144 "
```
```
" NodeType": 97,
```
```
" RequestArguments": {
```
```
" HumanReadable": "True",
```
```
" UserMessage": ""
```

// / s o l a r _a p i / v1 / G e t Ar ch i ve Da ta. cg i? Sc o p e= D e vi ce & D e vi c e C la ss = Oh m P i lo t& D e vi c e I d = 0 & StartDate
= 6. 3. 201 8 & E n d D a t e =6. 3. 20 1 8 & Channel=EnergyReal_WAC_Sum_Consumed

"Val ues" :
{
"42060 " : /* seconds after "Start" */
{
"#" : 3, /* Event Code 3 */
"attr" : /* Event Specific Data */
{
"Power" : "20 [%]",
" Radient" : "255 [1]",
"affect" : "P"
},
"desc" : "Power limitation 20%", /* Event Description */
"flags" :
[
"send"
]
}
},
" _comment" : " channelId =16711680 "
}
},
"End" : "2018 - 03 - 02 T23 :59:59+01:00 ",
"Start" : "2018 - 03 - 02 T00 :00:00+01:00 "
}
}
},
"Head" :
{
" RequestArguments" :
{
" Channel" :
[
" InverterEvents"
],
" EndDate" : "2018 - 03 - 02 T23 :59:59+01:00 ",
" HumanReadable" : "True",
"Scope" : "System",
" SeriesType" : "Detail",
" StartDate" : "2018 - 03 - 02 T00 :00:00+01:00 "
},
"Status" :
{
"Code" : 0,
" ErrorDetail" :
{
"Nod es" : []
},
"Reason" : "",
" UserMessage" : ""
},
" Timestamp" : "2018 - 03 - 02 T11 :42:50+01:00 "
}
}

#### 5.2.5 OhmPilot Energy

OhmPilot uses total energy counter!

```
Listing 66: detailed response body for one OhmPilot
```

"Data" :
{
" ohmpilot:28136344 " :
{
"Data" :
{
" En e rg y Re a l_ W A C _ S u m _ C o n s u m e d" :
{
"Unit" : "Wh",
"Values" :
{
"0" : 858547 ,
"10200 " : 858547 ,
"10500 " : 858547 ,
"10800 " : 858547 ,
"11100 " : 858547 ,
"11400 " : 858547 ,
"11700 " : 858547 ,
"1200 " : 858547 ,
"12000 " : 858547 ,
/* shorten list for readability */
"84000 " : 867084 ,
"84300 " : 867085 ,
"84600 " : 867087 ,
"84900 " : 867089 ,
"85200 " : 867091 ,
"85500 " : 867093 ,
"85800 " : 867095 ,
"86100 " : 867097 ,
"8700 " : 858547 ,
"900 " : 858547 ,
"9000 " : 858547 ,
"9300 " : 858547 ,
"9600 " : 858547 ,
"9900 " : 858547
},
" _comment" : " channelId =67895560 "
}
},
"End" : "2018 - 03 - 06 T23 :59:59+01:00 ",
"Start" : "2018 - 03 - 06 T00 :00:00+01:00 "
}
}
},
"Head" :
{
" RequestArguments" :
{
" Channel" :
[
" EnergyReal_ WAC_Sum_ Co nsumed"
],
" Devi ceClass" : " OhmPi lot",
" DeviceId" : "0",
" EndDate" : "2018 - 03 - 06 T23 :59:59+01:00 ",
" HumanReadable" : "True",
"Scope" : "Device",
" SeriesType" : "Detail",
" StartDate" : "2018 - 03 - 06 T00 :00:00+01:00 "
},
"Status" :
{
"Code" : 0,
" ErrorDetail" :
{
"Nod es" : []
},


## 6 Definitions and Mappings

### 6.1 Sunspec State Mapping

```
Table 6: Shows mapping between Fronius device status and SunSpec Inverter-Model states
```
```
Fronius device state SunSpec device state
not used I_STATUS_OFF
not used I_STATUS_SLEEPING
not used I_STATUS_THROTTLED
not used I_STATUS_SHUTTING_DOWN
10 I_STATUS_FAULT
8 I_STATUS_STANDBY
7 I_STATUS_MPPT
others I_STATUS_STARTING
```
### 6.2 Inverter Device Type List.....................................................................................................................................

```
DeviceType Model Name
1 any Fronius GEN24/Tauro/Verto
42 Symo Advanced 10.0- 3 - M
43 Symo Advanced 20.0- 3 - M
44 Symo Advanced 17.5- 3 - M
45 Symo Advanced 15.0- 3 - M
46 Symo Advanced 12.5- 3 - M
47 Symo Advanced 24.0- 3 480
48 Symo Advanced 22.7- 3 480
49 Symo Advanced 20.0- 3 480
50 Symo Advanced 15.0- 3 480
51 Symo Advanced 12.0- 3 208 - 240
52 Symo Advanced 10.0- 3 208 - 240
67 Fronius Primo 15.0- 1 208 - 240
68 Fronius Primo 12.5- 1 208 - 240
69 Fronius Primo 11.4-1 208- 240
70 Fronius Primo 10.0- 1 208 - 240
71 Fronius Symo 15.0- 3 208
72 Fronius Eco 27.0- 3 - S
73 Fronius Eco 25.0- 3 - S
75 Fronius Primo 6.0- 1
76 Fronius Primo 5.0- 1
77 Fronius Primo 4.6- 1
78 Fronius Primo 4.0- 1
79 Fronius Primo 3.6- 1
80 Fronius Primo 3.5- 1
81 Fronius Primo 3.0- 1
82 Fronius Symo Hybrid 4.0- 3 - S
83 Fronius Symo Hybrid 3.0- 3 - S
84 Fronius IG Plus 120 V- 1
```

85 Fronius Primo 3.8- 1 208 - 240
86 Fronius Primo 5.0- 1 208 - 240
87 Fronius Primo 6.0- 1 208 - 240
88 Fronius Primo 7.6- 1 208 - 240
89 Fronius Symo 24.0- 3 USA Dummy
90 Fronius Symo 24.0- 3 480
91 Fronius Symo 22.7- 3 480
92 Fronius Symo 20.0- 3 480
93 Fronius Symo 17.5- 3 480
94 Fronius Symo 15.0- 3 480
95 Fronius Symo 12.5- 3 480
96 Fronius Symo 10.0- 3 480
97 Fronius Symo 12.0- 3 208 - 240
98 Fronius Symo 10.0- 3 208 - 240
99 Fronius Symo Hybrid 5.0- 3 - S
100 Fronius Primo 8.2- 1 Dummy
101 Fronius Primo 8.2- 1 208 - 240
102 Fronius Primo 8.2- 1
103 Fronius Agilo TL 360.0- 3
104 Fronius Agilo TL 460.0- 3
105 Fronius Symo 7.0- 3 - M
106 Fronius Galvo 3.1- 1 208 - 240
107 Fronius Galvo 2.5- 1 208 - 240
108 Fronius Galvo 2.0- 1 208 - 240
109 Fronius Galvo 1.5- 1 208 - 240
110 Fronius Symo 6.0- 3 - M
111 Fronius Symo 4.5- 3 - M
112 Fronius Symo 3.7- 3 - M
113 Fronius Symo 3.0- 3 - M
114 Fronius Symo 17.5- 3 - M
115 Fronius Symo 15.0- 3 - M
116 Fronius Agilo 75.0- 3 Outdoor
117 Fronius Agilo 100.0- 3 Outdoor
118 Fronius IG Plus 55 V- 1
119 Fronius IG Plus 55 V- 2
120 Fronius Symo 20.0- 3 Dummy
121 Fronius Symo 20.0- 3 - M
122 Fronius Symo 5.0- 3 - M
123 Fronius Symo 8.2- 3 - M
124 Fronius Symo 6.7- 3 - M
125 Fronius Symo 5.5- 3 - M
126 Fronius Symo 4.5- 3 - S
127 Fronius Symo 3.7- 3 - S
128 Fronius IG Plus 60 V- 2
129 Fronius IG Plus 60 V- 1
130 SPR 8001F- 3 EU
131 Fronius IG Plus 25 V- 1
132 Fronius IG Plus 100 V- 3
133 Fronius Agilo 100.0- 3
134 SPR 3001F- 1 EU
135 Fronius IG Plus V/A 10.0- 3 Delta
136 Fronius IG 50
137 Fronius IG Plus 30 V- 1
138 SPR-11401f- 1 UNI
139 SPR-12001f- 3 WYE277
140 SPR-11401f- 3 Delta
141 SPR-10001f- 1 UNI
142 SPR-7501f- 1 UNI
143 SPR-6501f- 1 UNI


144 SPR-3801f- 1 UNI
145 SPR-3301f- 1 UNI
146 SPR 12001F- 3 EU
147 SPR 10001F- 3 EU
148 SPR 8001F- 2 EU
149 SPR 6501F- 2 EU
150 SPR 4001F- 1 EU
151 SPR 3501F- 1 EU
152 Fronius CL 60.0 WYE277 Dummy
153 Fronius CL 55.5 Delta Dummy
154 Fronius CL 60.0 Dummy
155 Fronius IG Plus V 12.0- 3 Dummy
156 Fronius IG Plus V 7.5- 1 Dummy
157 Fronius IG Plus V 3.8- 1 Dummy
158 Fronius IG Plus 150 V- 3 Dummy
159 Fronius IG Plus 100 V- 2 Dummy
160 Fronius IG Plus 50 V- 1 Dummy
161 Fronius IG Plus V/A 12.0- 3 WYE
162 Fronius IG Plus V/A 11.4- 3 Delta
163 Fronius IG Plus V/A 11.4- 1 UNI
164 Fronius IG Plus V/A 10.0- 1 UNI
165 Fronius IG Plus V/A 7.5- 1 UNI
166 Fronius IG Plus V/A 6.0- 1 UNI
167 Fronius IG Plus V/A 5.0- 1 UNI
168 Fronius IG Plus V/A 3.8- 1 UNI
169 Fronius IG Plus V/A 3.0- 1 UNI
170 Fronius IG Plus 150 V- 3
171 Fronius IG Plus 120 V- 3
172 Fronius IG Plus 100 V- 2
173 Fronius IG Plus 100 V- 1
174 Fronius IG Plus 70 V- 2
175 Fronius IG Plus 70 V- 1
176 Fronius IG Plus 50 V- 1
177 Fronius IG Plus 35 V- 1
178 SPR 11400f- 3 208/240
179 SPR 12000f- 277
180 SPR 10000f
181 SPR 10000F EU
182 Fronius CL 33.3 Delta
183 Fronius CL 44.4 Delta
184 Fronius CL 55.5 Delta
185 Fronius CL 36.0 WYE277
186 Fronius CL 48.0 WYE277
187 Fronius CL 60.0 WYE277
188 Fronius CL 36.0
189 Fronius CL 48.0
190 Fronius IG TL 3.0
191 Fronius IG TL 4.0
192 Fronius IG TL 5.0
193 Fronius IG TL 3.6
194 Fronius IG TL Dummy
195 Fronius IG TL 4.6
196 SPR 12000F EU
197 SPR 8000F EU
198 SPR 6500F EU
199 SPR 4000F EU
200 SPR 3300F EU
201 Fronius CL 60.0
202 SPR 12000f


203 SPR 8000f
204 SPR 6500f
205 SPR 4000f
206 SPR 3300f
207 Fronius IG Plus 12.0- 3 WYE277
208 Fronius IG Plus 50
209 Fronius IG Plus 100
210 Fronius IG Plus 100
211 Fronius IG Plus 150
212 Fronius IG Plus 35
213 Fronius IG Plus 70
214 Fronius IG Plus 70
215 Fronius IG Plus 120
216 Fronius IG Plus 3.0- 1 UNI
217 Fronius IG Plus 3.8- 1 UNI
218 Fronius IG Plus 5.0- 1 UNI
219 Fronius IG Plus 6.0- 1 UNI
220 Fronius IG Plus 7.5- 1 UNI
221 Fronius IG Plus 10.0- 1 UNI
222 Fronius IG Plus 11.4- 1 UNI
223 Fronius IG Plus 11.4- 3 Delta
224 Fronius Galvo 3.0- 1
225 Fronius Galvo 2.5- 1
226 Fronius Galvo 2.0- 1
227 Fronius IG 4500 - LV
228 Fronius Galvo 1.5- 1
229 Fronius IG 2500 - LV
230 Fronius Agilo 75.0- 3
231 Fronius Agilo 100.0- 3 Dummy
232 Fronius Symo 10.0- 3 - M
233 Fronius Symo 12.5- 3 - M
234 Fronius IG 5100
235 Fronius IG 4000
236 Fronius Symo 8.2- 3 - M Dummy
237 Fronius IG 3000
238 Fronius IG 2000
239 Fronius Galvo 3.1- 1 Dummy
240 Fronius IG Plus 80 V- 3
241 Fronius IG Plus 60 V- 3
242 Fronius IG Plus 55 V- 3
243 Fronius IG 60 ADV
244 Fronius IG 500
245 Fronius IG 400
246 Fronius IG 300
247 Fronius Symo 3.0- 3 - S
248 Fronius Galvo 3.1- 1
249 Fronius IG 60 HV
250 Fronius IG 40
251 Fronius IG 30 Dummy
252 Fronius IG 30
253 Fronius IG 20
254 Fronius IG 15


### 6.3 Event Table for Fronius Devices

```
Event Code Description
1 System offset
2 Calibrate factor
3 Power control commands
4 Gradual Voltage dependend Power Reduction
5 Frequency Limit Change
6 Enter Backup Power Mode
7 Leave Backup Power Mode
8 Critical SOC reached within backmode
9 Component Specific StateCode
10 Calibration Suspension enabled
11 Datamanager reboot due to malfunction
```
### 6.4 Hybrid_Operating_State

```
Hybrid_Operating_State Description
0 disabled
1 normal
2 service
3 charge boost
4 nearly depleted
5 suspended
6 calibrate
7 grid support
8 deplete recovery
9 non operable ( temperature )
10 non operable ( voltage )
11 preheating
12 startup
13 until Hybrid 1.13.1: awake but non operable ( temperature )
since Hybrid 1.13.1: stopped ( temperature )
14 battery full
```
### 6.5 Meter Locations

```
Meter Location Description
0 Load
1 Grid
2 RESERVED
3 additional A.C. generator (generation only)
4 additional A.C. generator providing a battery (consumption and generation)
5 - 255 RESERVED
256 - 511 Sub Load
```
## 7 Changelog

Document version 21

- Added SM IP to the devicetypes and simplified the SM UL version in WND-WR-MB.
- Added note EnergyReal_WAC_Sum_Consumed not implemented in inverters.
- Added time zone details for Gen24 devices.
- Updated the questions and answers.

Document Version 20

- Added OhmpilotEcos entry to GetPowerFlowRealtimeData (GEN24/Tauro/Verto only).

Document Version 19


- updated device type list

Document Version 18

- fixed dead reference to online manual under section 4.10.4
- Tauro behaves ident to GEN24. Added Tauro examples.
- Added GEN24/Tauro/Verto devicetype 1 to table.
- Adding four MPPT tracker IDC/UDC entries to GEN24 Symo GetInverterRealtimeData CommonInver-
    terData example.

Document Version 17

- Fixed description about PowerFlow version attribute which is infact a number within a string.
- Updated details about GetInverterRealtime DataCollections at Gen24 and Symo Hybrid.
- Adding chapter explaining enabling/disabling of Solar API ( 3 ).
- Re-editing meter model descriptions at GetMeterRealtimeData. TS and UL Meter have signed current.

Document Version 16

- Timing constraints for archive requests updated (2.6).
- Update json example of request GetInverterRealtimeData and collection 3PInverterData for GEN24.
- Value T_Ambient in GetInverterRealtimeData is only supported by few devices (added listing).
- Added meter location dependend direction table for energies and powers (4.8.6)
- GEN24 Inverter will only provide total energy counters in 1.14 or later (no year and day values anymore)
- GEN24 provide swagger open api interface specification file (2.2.1)

Document Version 15

- Timing constraints for Realtime Requests added (2.6).
- Carlo Gavazzi meter devices added (4.8).

Document Version 14

- PowerFlowRealtimeData battery state 14 ”battery full” added
- Flag inverter energies within realtime requests as imprecise

Document Version 13

- description for Fronius GEN24 added.
- updated and added missing json examples
- added inverter device type list in section 6.2
- PowerFlowRealtimeData provides data of secondary meters
- added GetStorageRealtime example for LG-Chem and BYD B-Box
- NOTE: manufacturer changed for Solar Battery at GetStorageRealtimeData.cgi
- PowerFlowRealtimeData battery state 13 ”stopped (temperature)” added
- Inverter energy is AC related
- PowerFlowRealtimeData battery soc changed from non-decimal to decimal on demand (support both)
- PowerFlowRealtimeData introduced component identifier field CID
- added meter location table in section 6.5

Document Version 12

- never been published. Changes listed at version 13

Document Version 11

- NOTE: DefaultLanguage at GetLoggerInfo will be removed soon

Document Version 10

- note that all inverters (even invisible configured) are reportet at PowerFlow and Inverter request


- fixed description about availability of rel_Autonomy and rel_SelfConsumption at PowerFlow request
- fixed missing description of BatteryStandby at PowerFlow request
- improved and fixed GetArchiveData descriptions and examples

Document Version 9

- _Battery_ _ _Mode_ at PowerFlowRealtimeData got more states
- fixed GetLoggerLEDInfo.cgi example
- added meter location state ”unknown” while backup power is active
- placed notification to use http-get request (refer to section 2.4)
- added Smartloads/OhmPilot node at PowerFlowRealtimeData.fcgi
- added description about PowerFlowRealtimeData versioning
- described _Status_ _ _BatteryCell_ for Controller of Tesla at GetStorageRealtimeData.cgi
- added _Status_ _ _Battery_ description for Tesla at GetStorageRealtimeData.cgi
- GetInverterRealtimeData PAC type changed from unsigned to signed integer
- added channel names for Sensor Card (refer to table 5 )
- added description of field DeliveryFactor at GetLoggerInfo and updated example
- fixed description of GetInverterInfo: properties ’Show’ and ’CustomName’ have been mandatory since
    Version 3.0.3
- added GetOhmPilotRealtimeData.cgi
- added description of all possible Error Codes
- intodruced Solar API ”Compatibility Range” at GetAPIVersion.cgi
- fixed description of datatypes

```
cgi Field old description fixed description
GetAPIVersion.cgi APIVersion number unsigned integer
GetInverterInfo.cgi Body.Data.<>...
...ErrorCode
...StatusCode
Body.Data.<>.Show
```
```
number
```
```
number
```
```
integer
```
```
unsigned integer
GetInverterRealtimeData.cgi Body.Data...
...DAY_ENERGY
...YEAR_ENERGY
...TOTAL_ENERGY
```
```
unsigned int unsigned number
```
15th Septemper 2016

- fixed availability notes of GetInverterRealtimeData
- OhmPilot is listed too
- added battery status description
- added description for energies at GetPowerFlowRealtimeData

11th February 2016

- fixed availability of request GetPowerFlowRealtimeData

13th August 2015

- Added realtime request GetPowerFlowRealtimeData to api

10th July 2015

- Added realtime request GetStorageRealtimeData to api

1st June 2015

- Minor documentation update.
    GetLoggerLedInfo.cgi added ”alternating” led state (timeout of access point)
    GetArchiveData.cgi revised data queries and responses


## 8 Frequently asked questions

1. The application I wrote for the Fronius Datalogger Web does not work with the Fronius Datamanager.
    Why is that?
    This is because we had to make some changes in the API to ensure compatibility with future devices.
    Specifically the DeviceIndex parameter is now named DeviceId and the request URLs have been changed
    to include an API version. For further details please refer to the latest version of the API specs.
2. Which data can I get?
    Currently only realtime data from inverters, Fronius Sensor Cards and Fronius String Controls. Also some
    information about the logging device itself is available.
    Please refer to the API specs for further details.
3. Can multiple clients send requests to the API at the same time?
    Yes, but the requests may take longer to complete.
4. Can I use this API at the same time as other services of the Datalogger Web / DataManager?
    Yes. The datalogging, Solar.access/Solar.web connection, Webinterface, this API or any other service can
    be used independently from the others.
5. Can the API calls be password protected?
    No. The API is always accessible without authentication, regardless of the user or admin password set on
    the Webinterface.
6. The API reports more inverters than I have, why is that?
    This may be the case when the inverter number of an inverter is changed while the Fronius Datalogger Web
    / Fronius Datamanager is running. The logger then detects a new device but keeps the same device with
    the previous inverter number in the system for 24 hours. This is due to the fact that the datalogger is caching
    the devices for a certain time even if they are not present on the bus (e.g. to be able to display energy values
    during the night when the inverters are offline).
    Those ghost devices will disappear 24 hours after the have been last seen by the datalogger. Alternatively,
    a reboot of the datalogger also clears the device cache and repopulates it with the currently present devices.
7. What is the maximum requests per second?
    Maximum is 1 request per second.
8. What is the maximum number of simultaneous connections?
    There is no limit on simulatenous connections; however, the Datamanager, Hybridmanager, Gen24 could
    take longer to response, see the timeout section in page 9 for more details.
9. What is the minimum data update?
    Crucial inverter data is updated every second. Non crucial data on Datamanagers/Hybridmanagers,
    according to the configured Solarweb datalogging interval. For Gen24 every 5 min.


# Fronius Worldwide - http://www.fronius.com/addresses

```
Fronius International GmbH
4600 Wels, Froniusplatz 1, Austria
E-Mail: pv-sales@fronius.com
http://www.fronius.com
```
```
Fronius USA LLC Solar Electronics Division
6797 Fronius Drive, Portage, IN 46368
E-Mail: pv-us@fronius.com
http://www.fronius-usa.com
```
Under [http://www.fronius.com/addresses](http://www.fronius.com/addresses) you will find all addresses of our sales branches and partner firms!


