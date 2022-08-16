# LIFX
Control your lifx lights right in raycast

Generate an token here: [cloud.lifx.com](https://cloud.lifx.com)

**The selectors for closing what to control:**

|Selector||
|--|--|
| `all` | All lights belonging to the authenticated account |
| `label:[value]` | Lights that match the label. |
|`id:[value]` | The light with the given id/serial number. Returns a list of one light. |
|`group_id:[value]` |The lights belonging to the group with the given ID |
| `group:[value]`| The lights belonging to the groups matching the given label|
|`location_id:[value]` | The lights belonging to the location matching the given ID|
| `location:[value]`|The lights belonging to the locations matching the given label |
|`scene_id:[value]` |The lights that are referenced in the scene with the given ID |


**The available colors to change your lights:**


| Format | Example |  Notes |
|--|--|--|
| `[name]`| `white`,  `red`,  `orange`,  `yellow`,  `cyan`,  `green`,  `blue`,  `purple`, or  `pink` |Sets the hue and saturation components, but leaves brightness untouched. |
| `hue:[0-360]` | `hue:120` | Sets hue without affecting other components |
| `saturation:[0.0-1.0]` | `saturation:0.5` | Sets saturation without affecting other components |
| `brightness:[0.0-1.0]` | `brightness:0.5` | Sets brightness without affecting other components |
|`kelvin:[1500-9000]`|`kelvin:5000`|Sets kelvin to the given value and saturation to  `0.0`. Other components are not affected.|
|`#RRGGBB`|`#ff0000`|Automatically converts to HSBK|
|`rgb:[0-255],[0-255],[0-255]`|`rgb:255,255,0`|Automatically converts to HSBK|

