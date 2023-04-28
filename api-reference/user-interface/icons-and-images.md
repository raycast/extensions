# Icons & Images

## API Reference

### Icon

List of built-in icons that can be used for actions or list items.

#### Example

```typescript
import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="Icon" icon={Icon.Circle} />
    </List>
  );
}
```

#### Enumeration members

|                <p><img src="../../.gitbook/assets/icon-add-person-16.svg" alt=""><br>AddPerson</p>                |             <p><img src="../../.gitbook/assets/icon-airplane-16.svg" alt=""><br>Airplane</p>             |         <p><img src="../../.gitbook/assets/icon-airplane-filled-16.svg" alt=""><br>AirplaneFilled</p>         |
| :---------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------: |
|          <p><img src="../../.gitbook/assets/icon-airplane-landing-16.svg" alt=""><br>AirplaneLanding</p>          |     <p><img src="../../.gitbook/assets/icon-airplane-takeoff-16.svg" alt=""><br>AirplaneTakeoff</p>      |                <p><img src="../../.gitbook/assets/icon-airpods-16.svg" alt=""><br>Airpods</p>                 |
|                    <p><img src="../../.gitbook/assets/icon-alarm-16.svg" alt=""><br>Alarm</p>                     |        <p><img src="../../.gitbook/assets/icon-alarm-ringing-16.svg" alt=""><br>AlarmRinging</p>         |            <p><img src="../../.gitbook/assets/icon-align-centre-16.svg" alt=""><br>AlignCentre</p>            |
|                <p><img src="../../.gitbook/assets/icon-align-left-16.svg" alt=""><br>AlignLeft</p>                |          <p><img src="../../.gitbook/assets/icon-align-right-16.svg" alt=""><br>AlignRight</p>           |       <p><img src="../../.gitbook/assets/icon-american-football-16.svg" alt=""><br>AmericanFootball</p>       |
|                   <p><img src="../../.gitbook/assets/icon-anchor-16.svg" alt=""><br>Anchor</p>                    |           <p><img src="../../.gitbook/assets/icon-app-window-16.svg" alt=""><br>AppWindow</p>            |      <p><img src="../../.gitbook/assets/icon-app-window-grid-2x2-16.svg" alt=""><br>AppWindowGrid2x2</p>      |
|        <p><img src="../../.gitbook/assets/icon-app-window-grid-3x3-16.svg" alt=""><br>AppWindowGrid3x3</p>        |       <p><img src="../../.gitbook/assets/icon-app-window-list-16.svg" alt=""><br>AppWindowList</p>       |  <p><img src="../../.gitbook/assets/icon-app-window-sidebar-left-16.svg" alt=""><br>AppWindowSidebarLeft</p>  |
|   <p><img src="../../.gitbook/assets/icon-app-window-sidebar-right-16.svg" alt=""><br>AppWindowSidebarRight</p>   |      <p><img src="../../.gitbook/assets/icon-arrow-clockwise-16.svg" alt=""><br>ArrowClockwise</p>       | <p><img src="../../.gitbook/assets/icon-arrow-counter-clockwise-16.svg" alt=""><br>ArrowCounterClockwise</p>  |
|                <p><img src="../../.gitbook/assets/icon-arrow-down-16.svg" alt=""><br>ArrowDown</p>                |     <p><img src="../../.gitbook/assets/icon-arrow-down-circle-16.svg" alt=""><br>ArrowDownCircle</p>     | <p><img src="../../.gitbook/assets/icon-arrow-down-circle-filled-16.svg" alt=""><br>ArrowDownCircleFilled</p> |
|                <p><img src="../../.gitbook/assets/icon-arrow-left-16.svg" alt=""><br>ArrowLeft</p>                |     <p><img src="../../.gitbook/assets/icon-arrow-left-circle-16.svg" alt=""><br>ArrowLeftCircle</p>     | <p><img src="../../.gitbook/assets/icon-arrow-left-circle-filled-16.svg" alt=""><br>ArrowLeftCircleFilled</p> |
|                  <p><img src="../../.gitbook/assets/icon-arrow-ne-16.svg" alt=""><br>ArrowNe</p>                  |          <p><img src="../../.gitbook/assets/icon-arrow-right-16.svg" alt=""><br>ArrowRight</p>           |      <p><img src="../../.gitbook/assets/icon-arrow-right-circle-16.svg" alt=""><br>ArrowRightCircle</p>       |
|  <p><img src="../../.gitbook/assets/icon-arrow-right-circle-filled-16.svg" alt=""><br>ArrowRightCircleFilled</p>  |             <p><img src="../../.gitbook/assets/icon-arrow-up-16.svg" alt=""><br>ArrowUp</p>              |         <p><img src="../../.gitbook/assets/icon-arrow-up-circle-16.svg" alt=""><br>ArrowUpCircle</p>          |
|     <p><img src="../../.gitbook/assets/icon-arrow-up-circle-filled-16.svg" alt=""><br>ArrowUpCircleFilled</p>     |      <p><img src="../../.gitbook/assets/icon-arrows-contract-16.svg" alt=""><br>ArrowsContract</p>       |           <p><img src="../../.gitbook/assets/icon-arrows-expand-16.svg" alt=""><br>ArrowsExpand</p>           |
|                 <p><img src="../../.gitbook/assets/icon-at-symbol-16.svg" alt=""><br>AtSymbol</p>                 |             <p><img src="../../.gitbook/assets/icon-band-aid-16.svg" alt=""><br>BandAid</p>              |               <p><img src="../../.gitbook/assets/icon-bank-note-16.svg" alt=""><br>BankNote</p>               |
|                 <p><img src="../../.gitbook/assets/icon-bar-chart-16.svg" alt=""><br>BarChart</p>                 |             <p><img src="../../.gitbook/assets/icon-bar-code-16.svg" alt=""><br>BarCode</p>              |                <p><img src="../../.gitbook/assets/icon-bath-tub-16.svg" alt=""><br>BathTub</p>                |
|                  <p><img src="../../.gitbook/assets/icon-battery-16.svg" alt=""><br>Battery</p>                   |     <p><img src="../../.gitbook/assets/icon-battery-charging-16.svg" alt=""><br>BatteryCharging</p>      |        <p><img src="../../.gitbook/assets/icon-battery-disabled-16.svg" alt=""><br>BatteryDisabled</p>        |
|                     <p><img src="../../.gitbook/assets/icon-bell-16.svg" alt=""><br>Bell</p>                      |        <p><img src="../../.gitbook/assets/icon-bell-disabled-16.svg" alt=""><br>BellDisabled</p>         |                   <p><img src="../../.gitbook/assets/icon-bike-16.svg" alt=""><br>Bike</p>                    |
|               <p><img src="../../.gitbook/assets/icon-binoculars-16.svg" alt=""><br>Binoculars</p>                |                 <p><img src="../../.gitbook/assets/icon-bird-16.svg" alt=""><br>Bird</p>                 |          <p><img src="../../.gitbook/assets/icon-blank-document-16.svg" alt=""><br>BlankDocument</p>          |
|                <p><img src="../../.gitbook/assets/icon-bluetooth-16.svg" alt=""><br>Bluetooth</p>                 |                 <p><img src="../../.gitbook/assets/icon-boat-16.svg" alt=""><br>Boat</p>                 |                   <p><img src="../../.gitbook/assets/icon-bold-16.svg" alt=""><br>Bold</p>                    |
|                     <p><img src="../../.gitbook/assets/icon-bolt-16.svg" alt=""><br>Bolt</p>                      |        <p><img src="../../.gitbook/assets/icon-bolt-disabled-16.svg" alt=""><br>BoltDisabled</p>         |                   <p><img src="../../.gitbook/assets/icon-book-16.svg" alt=""><br>Book</p>                    |
|                 <p><img src="../../.gitbook/assets/icon-bookmark-16.svg" alt=""><br>Bookmark</p>                  |                  <p><img src="../../.gitbook/assets/icon-box-16.svg" alt=""><br>Box</p>                  |                  <p><img src="../../.gitbook/assets/icon-brush-16.svg" alt=""><br>Brush</p>                   |
|                <p><img src="../../.gitbook/assets/icon-speech-bubble-16.svg" alt=""><br>Bubble</p>                |                  <p><img src="../../.gitbook/assets/icon-bug-16.svg" alt=""><br>Bug</p>                  |               <p><img src="../../.gitbook/assets/icon-building-16.svg" alt=""><br>Building</p>                |
|             <p><img src="../../.gitbook/assets/icon-bullet-points-16.svg" alt=""><br>BulletPoints</p>             |            <p><img src="../../.gitbook/assets/icon-bulls-eye-16.svg" alt=""><br>BullsEye</p>             |                   <p><img src="../../.gitbook/assets/icon-buoy-16.svg" alt=""><br>Buoy</p>                    |
|               <p><img src="../../.gitbook/assets/icon-calculator-16.svg" alt=""><br>Calculator</p>                |             <p><img src="../../.gitbook/assets/icon-calendar-16.svg" alt=""><br>Calendar</p>             |                 <p><img src="../../.gitbook/assets/icon-camera-16.svg" alt=""><br>Camera</p>                  |
|                      <p><img src="../../.gitbook/assets/icon-car-16.svg" alt=""><br>Car</p>                       |                 <p><img src="../../.gitbook/assets/icon-cart-16.svg" alt=""><br>Cart</p>                 |                     <p><img src="../../.gitbook/assets/icon-cd-16.svg" alt=""><br>Cd</p>                      |
|                   <p><img src="../../.gitbook/assets/icon-center-16.svg" alt=""><br>Center</p>                    |                <p><img src="../../.gitbook/assets/icon-check-16.svg" alt=""><br>Check</p>                |            <p><img src="../../.gitbook/assets/icon-check-circle-16.svg" alt=""><br>CheckCircle</p>            |
|             <p><img src="../../.gitbook/assets/icon-check-rosette-16.svg" alt=""><br>CheckRosette</p>             |          <p><img src="../../.gitbook/assets/icon-check-circle-16.svg" alt=""><br>Checkmark</p>           |             <p><img src="../../.gitbook/assets/icon-chess-piece-16.svg" alt=""><br>ChessPiece</p>             |
|              <p><img src="../../.gitbook/assets/icon-chevron-down-16.svg" alt=""><br>ChevronDown</p>              |    <p><img src="../../.gitbook/assets/icon-chevron-down-small-16.svg" alt=""><br>ChevronDownSmall</p>    |            <p><img src="../../.gitbook/assets/icon-chevron-left-16.svg" alt=""><br>ChevronLeft</p>            |
|        <p><img src="../../.gitbook/assets/icon-chevron-left-small-16.svg" alt=""><br>ChevronLeftSmall</p>         |        <p><img src="../../.gitbook/assets/icon-chevron-right-16.svg" alt=""><br>ChevronRight</p>         |     <p><img src="../../.gitbook/assets/icon-chevron-right-small-16.svg" alt=""><br>ChevronRightSmall</p>      |
|                <p><img src="../../.gitbook/assets/icon-chevron-up-16.svg" alt=""><br>ChevronUp</p>                |      <p><img src="../../.gitbook/assets/icon-chevron-up-small-16.svg" alt=""><br>ChevronUpSmall</p>      |                 <p><img src="../../.gitbook/assets/icon-circle-16.svg" alt=""><br>Circle</p>                  |
|           <p><img src="../../.gitbook/assets/icon-circle-ellipsis-16.svg" alt=""><br>CircleEllipsis</p>           |        <p><img src="../../.gitbook/assets/icon-circle-filled-16.svg" alt=""><br>CircleFilled</p>         |         <p><img src="../../.gitbook/assets/icon-circle-progress-16.svg" alt=""><br>CircleProgress</p>         |
|       <p><img src="../../.gitbook/assets/icon-circle-progress-100-16.svg" alt=""><br>CircleProgress100</p>        |    <p><img src="../../.gitbook/assets/icon-circle-progress-25-16.svg" alt=""><br>CircleProgress25</p>    |      <p><img src="../../.gitbook/assets/icon-circle-progress-50-16.svg" alt=""><br>CircleProgress50</p>       |
|        <p><img src="../../.gitbook/assets/icon-circle-progress-75-16.svg" alt=""><br>CircleProgress75</p>         |     <p><img src="../../.gitbook/assets/icon-clear-formatting-16.svg" alt=""><br>ClearFormatting</p>      |            <p><img src="../../.gitbook/assets/icon-copy-clipboard-16.svg" alt=""><br>Clipboard</p>            |
|                    <p><img src="../../.gitbook/assets/icon-clock-16.svg" alt=""><br>Clock</p>                     |                <p><img src="../../.gitbook/assets/icon-cloud-16.svg" alt=""><br>Cloud</p>                |         <p><img src="../../.gitbook/assets/icon-cloud-lightning-16.svg" alt=""><br>CloudLightning</p>         |
|                <p><img src="../../.gitbook/assets/icon-cloud-rain-16.svg" alt=""><br>CloudRain</p>                |           <p><img src="../../.gitbook/assets/icon-cloud-snow-16.svg" alt=""><br>CloudSnow</p>            |               <p><img src="../../.gitbook/assets/icon-cloud-sun-16.svg" alt=""><br>CloudSun</p>               |
|                     <p><img src="../../.gitbook/assets/icon-code-16.svg" alt=""><br>Code</p>                      |           <p><img src="../../.gitbook/assets/icon-code-block-16.svg" alt=""><br>CodeBlock</p>            |                    <p><img src="../../.gitbook/assets/icon-cog-16.svg" alt=""><br>Cog</p>                     |
|                     <p><img src="../../.gitbook/assets/icon-coin-16.svg" alt=""><br>Coin</p>                      |                <p><img src="../../.gitbook/assets/icon-coins-16.svg" alt=""><br>Coins</p>                |          <p><img src="../../.gitbook/assets/icon-command-symbol-16.svg" alt=""><br>CommandSymbol</p>          |
|                  <p><img src="../../.gitbook/assets/icon-compass-16.svg" alt=""><br>Compass</p>                   |        <p><img src="../../.gitbook/assets/icon-computer-chip-16.svg" alt=""><br>ComputerChip</p>         |               <p><img src="../../.gitbook/assets/icon-contrast-16.svg" alt=""><br>Contrast</p>                |
|            <p><img src="../../.gitbook/assets/icon-copy-clipboard-16.svg" alt=""><br>CopyClipboard</p>            |          <p><img src="../../.gitbook/assets/icon-credit-card-16.svg" alt=""><br>CreditCard</p>           |            <p><img src="../../.gitbook/assets/icon-cricket-ball-16.svg" alt=""><br>CricketBall</p>            |
|                     <p><img src="../../.gitbook/assets/icon-crop-16.svg" alt=""><br>Crop</p>                      |                <p><img src="../../.gitbook/assets/icon-crown-16.svg" alt=""><br>Crown</p>                |                 <p><img src="../../.gitbook/assets/icon-crypto-16.svg" alt=""><br>Crypto</p>                  |
|           <p><img src="../../.gitbook/assets/icon-delete-document-16.svg" alt=""><br>DeleteDocument</p>           |              <p><img src="../../.gitbook/assets/icon-desktop-16.svg" alt=""><br>Desktop</p>              |                    <p><img src="../../.gitbook/assets/icon-dna-16.svg" alt=""><br>Dna</p>                     |
|              <p><img src="../../.gitbook/assets/icon-blank-document-16.svg" alt=""><br>Document</p>               |                  <p><img src="../../.gitbook/assets/icon-dot-16.svg" alt=""><br>Dot</p>                  |               <p><img src="../../.gitbook/assets/icon-download-16.svg" alt=""><br>Download</p>                |
|                <p><img src="../../.gitbook/assets/icon-edit-shape-16.svg" alt=""><br>EditShape</p>                |                <p><img src="../../.gitbook/assets/icon-eject-16.svg" alt=""><br>Eject</p>                |               <p><img src="../../.gitbook/assets/icon-ellipsis-16.svg" alt=""><br>Ellipsis</p>                |
|                    <p><img src="../../.gitbook/assets/icon-emoji-16.svg" alt=""><br>Emoji</p>                     |             <p><img src="../../.gitbook/assets/icon-envelope-16.svg" alt=""><br>Envelope</p>             |                 <p><img src="../../.gitbook/assets/icon-eraser-16.svg" alt=""><br>Eraser</p>                  |
|            <p><img src="../../.gitbook/assets/icon-important-01-16.svg" alt=""><br>ExclamationMark</p>            |      <p><img src="../../.gitbook/assets/icon-exclamationmark-16.svg" alt=""><br>Exclamationmark</p>      |       <p><img src="../../.gitbook/assets/icon-exclamationmark-2-16.svg" alt=""><br>Exclamationmark2</p>       |
|         <p><img src="../../.gitbook/assets/icon-exclamationmark-3-16.svg" alt=""><br>Exclamationmark3</p>         |                  <p><img src="../../.gitbook/assets/icon-eye-16.svg" alt=""><br>Eye</p>                  |            <p><img src="../../.gitbook/assets/icon-eye-disabled-16.svg" alt=""><br>EyeDisabled</p>            |
|               <p><img src="../../.gitbook/assets/icon-eye-dropper-16.svg" alt=""><br>EyeDropper</p>               |               <p><img src="../../.gitbook/assets/icon-female-16.svg" alt=""><br>Female</p>               |              <p><img src="../../.gitbook/assets/icon-film-strip-16.svg" alt=""><br>FilmStrip</p>              |
|                   <p><img src="../../.gitbook/assets/icon-filter-16.svg" alt=""><br>Filter</p>                    |               <p><img src="../../.gitbook/assets/icon-finder-16.svg" alt=""><br>Finder</p>               |            <p><img src="../../.gitbook/assets/icon-fingerprint-16.svg" alt=""><br>Fingerprint</p>             |
|                     <p><img src="../../.gitbook/assets/icon-flag-16.svg" alt=""><br>Flag</p>                      |               <p><img src="../../.gitbook/assets/icon-folder-16.svg" alt=""><br>Folder</p>               |             <p><img src="../../.gitbook/assets/icon-footprints-16.svg" alt=""><br>Footprints</p>              |
|                  <p><img src="../../.gitbook/assets/icon-forward-16.svg" alt=""><br>Forward</p>                   |       <p><img src="../../.gitbook/assets/icon-forward-filled-16.svg" alt=""><br>ForwardFilled</p>        |            <p><img src="../../.gitbook/assets/icon-fountain-tip-16.svg" alt=""><br>FountainTip</p>            |
|               <p><img src="../../.gitbook/assets/icon-full-signal-16.svg" alt=""><br>FullSignal</p>               |      <p><img src="../../.gitbook/assets/icon-game-controller-16.svg" alt=""><br>GameController</p>       |                  <p><img src="../../.gitbook/assets/icon-gauge-16.svg" alt=""><br>Gauge</p>                   |
|                      <p><img src="../../.gitbook/assets/icon-cog-16.svg" alt=""><br>Gear</p>                      |               <p><img src="../../.gitbook/assets/icon-geopin-16.svg" alt=""><br>Geopin</p>               |                   <p><img src="../../.gitbook/assets/icon-germ-16.svg" alt=""><br>Germ</p>                    |
|                     <p><img src="../../.gitbook/assets/icon-gift-16.svg" alt=""><br>Gift</p>                      |              <p><img src="../../.gitbook/assets/icon-glasses-16.svg" alt=""><br>Glasses</p>              |                 <p><img src="../../.gitbook/assets/icon-globe-01-16.svg" alt=""><br>Globe</p>                 |
|                     <p><img src="../../.gitbook/assets/icon-goal-16.svg" alt=""><br>Goal</p>                      |               <p><img src="../../.gitbook/assets/icon-hammer-16.svg" alt=""><br>Hammer</p>               |              <p><img src="../../.gitbook/assets/icon-hard-drive-16.svg" alt=""><br>HardDrive</p>              |
|                  <p><img src="../../.gitbook/assets/icon-hashtag-16.svg" alt=""><br>Hashtag</p>                   |           <p><img src="../../.gitbook/assets/icon-headphones-16.svg" alt=""><br>Headphones</p>           |                  <p><img src="../../.gitbook/assets/icon-heart-16.svg" alt=""><br>Heart</p>                   |
|            <p><img src="../../.gitbook/assets/icon-heart-disabled-16.svg" alt=""><br>HeartDisabled</p>            |            <p><img src="../../.gitbook/assets/icon-heartbeat-16.svg" alt=""><br>Heartbeat</p>            |              <p><img src="../../.gitbook/assets/icon-highlight-16.svg" alt=""><br>Highlight</p>               |
|                <p><img src="../../.gitbook/assets/icon-hourglass-16.svg" alt=""><br>Hourglass</p>                 |                <p><img src="../../.gitbook/assets/icon-house-16.svg" alt=""><br>House</p>                |                  <p><img src="../../.gitbook/assets/icon-image-16.svg" alt=""><br>Image</p>                   |
|               <p><img src="../../.gitbook/assets/icon-important-01-16.svg" alt=""><br>Important</p>               |               <p><img src="../../.gitbook/assets/icon-info-01-16.svg" alt=""><br>Info</p>                |                <p><img src="../../.gitbook/assets/icon-italics-16.svg" alt=""><br>Italics</p>                 |
|                      <p><img src="../../.gitbook/assets/icon-key-16.svg" alt=""><br>Key</p>                       |             <p><img src="../../.gitbook/assets/icon-keyboard-16.svg" alt=""><br>Keyboard</p>             |                 <p><img src="../../.gitbook/assets/icon-layers-16.svg" alt=""><br>Layers</p>                  |
|              <p><img src="../../.gitbook/assets/icon-leaderboard-16.svg" alt=""><br>Leaderboard</p>               |                 <p><img src="../../.gitbook/assets/icon-leaf-16.svg" alt=""><br>Leaf</p>                 |              <p><img src="../../.gitbook/assets/icon-signal-2-16.svg" alt=""><br>LevelMeter</p>               |
|                <p><img src="../../.gitbook/assets/icon-light-bulb-16.svg" alt=""><br>LightBulb</p>                |        <p><img src="../../.gitbook/assets/icon-light-bulb-off-16.svg" alt=""><br>LightBulbOff</p>        |              <p><img src="../../.gitbook/assets/icon-line-chart-16.svg" alt=""><br>LineChart</p>              |
|                     <p><img src="../../.gitbook/assets/icon-link-16.svg" alt=""><br>Link</p>                      |           <p><img src="../../.gitbook/assets/icon-app-window-list-16.svg" alt=""><br>List</p>            |            <p><img src="../../.gitbook/assets/icon-livestream-01-16.svg" alt=""><br>Livestream</p>            |
|     <p><img src="../../.gitbook/assets/icon-livestream-disabled-01-16.svg" alt=""><br>LivestreamDisabled</p>      |                 <p><img src="../../.gitbook/assets/icon-lock-16.svg" alt=""><br>Lock</p>                 |           <p><img src="../../.gitbook/assets/icon-lock-disabled-16.svg" alt=""><br>LockDisabled</p>           |
|             <p><img src="../../.gitbook/assets/icon-lock-unlocked-16.svg" alt=""><br>LockUnlocked</p>             |               <p><img src="../../.gitbook/assets/icon-logout-16.svg" alt=""><br>Logout</p>               |                  <p><img src="../../.gitbook/assets/icon-lorry-16.svg" alt=""><br>Lorry</p>                   |
|                <p><img src="../../.gitbook/assets/icon-lowercase-16.svg" alt=""><br>Lowercase</p>                 |     <p><img src="../../.gitbook/assets/icon-magnifying-glass-16.svg" alt=""><br>MagnifyingGlass</p>      |                   <p><img src="../../.gitbook/assets/icon-male-16.svg" alt=""><br>Male</p>                    |
|                      <p><img src="../../.gitbook/assets/icon-map-16.svg" alt=""><br>Map</p>                       |                 <p><img src="../../.gitbook/assets/icon-mask-16.svg" alt=""><br>Mask</p>                 |               <p><img src="../../.gitbook/assets/icon-maximize-16.svg" alt=""><br>Maximize</p>                |
|           <p><img src="../../.gitbook/assets/icon-medical-support-16.svg" alt=""><br>MedicalSupport</p>           |            <p><img src="../../.gitbook/assets/icon-megaphone-16.svg" alt=""><br>Megaphone</p>            |            <p><img src="../../.gitbook/assets/icon-computer-chip-16.svg" alt=""><br>MemoryChip</p>            |
|              <p><img src="../../.gitbook/assets/icon-memory-stick-16.svg" alt=""><br>MemoryStick</p>              |           <p><img src="../../.gitbook/assets/icon-speech-bubble-16.svg" alt=""><br>Message</p>           |             <p><img src="../../.gitbook/assets/icon-microphone-16.svg" alt=""><br>Microphone</p>              |
|       <p><img src="../../.gitbook/assets/icon-microphone-disabled-16.svg" alt=""><br>MicrophoneDisabled</p>       |             <p><img src="../../.gitbook/assets/icon-minimize-16.svg" alt=""><br>Minimize</p>             |                  <p><img src="../../.gitbook/assets/icon-minus-16.svg" alt=""><br>Minus</p>                   |
|              <p><img src="../../.gitbook/assets/icon-minus-circle-16.svg" alt=""><br>MinusCircle</p>              |   <p><img src="../../.gitbook/assets/icon-minus-circle-filled-16.svg" alt=""><br>MinusCircleFilled</p>   |                 <p><img src="../../.gitbook/assets/icon-mobile-16.svg" alt=""><br>Mobile</p>                  |
|                  <p><img src="../../.gitbook/assets/icon-monitor-16.svg" alt=""><br>Monitor</p>                   |                 <p><img src="../../.gitbook/assets/icon-moon-16.svg" alt=""><br>Moon</p>                 |               <p><img src="../../.gitbook/assets/icon-mountain-16.svg" alt=""><br>Mountain</p>                |
|                    <p><img src="../../.gitbook/assets/icon-mouse-16.svg" alt=""><br>Mouse</p>                     |             <p><img src="../../.gitbook/assets/icon-multiply-16.svg" alt=""><br>Multiply</p>             |                  <p><img src="../../.gitbook/assets/icon-music-16.svg" alt=""><br>Music</p>                   |
|                  <p><img src="../../.gitbook/assets/icon-network-16.svg" alt=""><br>Network</p>                   |         <p><img src="../../.gitbook/assets/icon-new-document-16.svg" alt=""><br>NewDocument</p>          |              <p><img src="../../.gitbook/assets/icon-new-folder-16.svg" alt=""><br>NewFolder</p>              |
|                <p><img src="../../.gitbook/assets/icon-paperclip-16.svg" alt=""><br>Paperclip</p>                 |            <p><img src="../../.gitbook/assets/icon-paragraph-16.svg" alt=""><br>Paragraph</p>            |                  <p><img src="../../.gitbook/assets/icon-patch-16.svg" alt=""><br>Patch</p>                   |
|                    <p><img src="../../.gitbook/assets/icon-pause-16.svg" alt=""><br>Pause</p>                     |         <p><img src="../../.gitbook/assets/icon-pause-filled-16.svg" alt=""><br>PauseFilled</p>          |                 <p><img src="../../.gitbook/assets/icon-pencil-16.svg" alt=""><br>Pencil</p>                  |
|                   <p><img src="../../.gitbook/assets/icon-person-16.svg" alt=""><br>Person</p>                    |        <p><img src="../../.gitbook/assets/icon-person-circle-16.svg" alt=""><br>PersonCircle</p>         |            <p><img src="../../.gitbook/assets/icon-person-lines-16.svg" alt=""><br>PersonLines</p>            |
|                    <p><img src="../../.gitbook/assets/icon-phone-16.svg" alt=""><br>Phone</p>                     |        <p><img src="../../.gitbook/assets/icon-phone-ringing-16.svg" alt=""><br>PhoneRinging</p>         |               <p><img src="../../.gitbook/assets/icon-pie-chart-16.svg" alt=""><br>PieChart</p>               |
|                     <p><img src="../../.gitbook/assets/icon-pill-16.svg" alt=""><br>Pill</p>                      |                  <p><img src="../../.gitbook/assets/icon-pin-16.svg" alt=""><br>Pin</p>                  |            <p><img src="../../.gitbook/assets/icon-pin-disabled-16.svg" alt=""><br>PinDisabled</p>            |
|                     <p><img src="../../.gitbook/assets/icon-play-16.svg" alt=""><br>Play</p>                      |          <p><img src="../../.gitbook/assets/icon-play-filled-16.svg" alt=""><br>PlayFilled</p>           |                   <p><img src="../../.gitbook/assets/icon-plug-16.svg" alt=""><br>Plug</p>                    |
|                     <p><img src="../../.gitbook/assets/icon-plus-16.svg" alt=""><br>Plus</p>                      |          <p><img src="../../.gitbook/assets/icon-plus-circle-16.svg" alt=""><br>PlusCircle</p>           |      <p><img src="../../.gitbook/assets/icon-plus-circle-filled-16.svg" alt=""><br>PlusCircleFilled</p>       |
| <p><img src="../../.gitbook/assets/icon-plus-minus-divide-multiply-16.svg" alt=""><br>PlusMinusDivideMultiply</p> |          <p><img src="../../.gitbook/assets/icon-plus-square-16.svg" alt=""><br>PlusSquare</p>           |    <p><img src="../../.gitbook/assets/icon-plus-top-right-square-16.svg" alt=""><br>PlusTopRightSquare</p>    |
|                    <p><img src="../../.gitbook/assets/icon-power-16.svg" alt=""><br>Power</p>                     |                <p><img src="../../.gitbook/assets/icon-print-16.svg" alt=""><br>Print</p>                |       <p><img src="../../.gitbook/assets/icon-question-mark-circle-16.svg" alt=""><br>QuestionMark</p>        |
|      <p><img src="../../.gitbook/assets/icon-question-mark-circle-16.svg" alt=""><br>QuestionMarkCircle</p>       |      <p><img src="../../.gitbook/assets/icon-quotation-marks-16.svg" alt=""><br>QuotationMarks</p>       |             <p><img src="../../.gitbook/assets/icon-quote-block-16.svg" alt=""><br>QuoteBlock</p>             |
|                   <p><img src="../../.gitbook/assets/icon-racket-16.svg" alt=""><br>Racket</p>                    |             <p><img src="../../.gitbook/assets/icon-raindrop-16.svg" alt=""><br>Raindrop</p>             |        <p><img src="../../.gitbook/assets/icon-raycast-logo-neg-16.svg" alt=""><br>RaycastLogoNeg</p>         |
|          <p><img src="../../.gitbook/assets/icon-raycast-logo-pos-16.svg" alt=""><br>RaycastLogoPos</p>           |              <p><img src="../../.gitbook/assets/icon-receipt-16.svg" alt=""><br>Receipt</p>              |                   <p><img src="../../.gitbook/assets/icon-redo-16.svg" alt=""><br>Redo</p>                    |
|             <p><img src="../../.gitbook/assets/icon-remove-person-16.svg" alt=""><br>RemovePerson</p>             |               <p><img src="../../.gitbook/assets/icon-repeat-16.svg" alt=""><br>Repeat</p>               |                  <p><img src="../../.gitbook/assets/icon-reply-16.svg" alt=""><br>Reply</p>                   |
|                   <p><img src="../../.gitbook/assets/icon-rewind-16.svg" alt=""><br>Rewind</p>                    |        <p><img src="../../.gitbook/assets/icon-rewind-filled-16.svg" alt=""><br>RewindFilled</p>         |                 <p><img src="../../.gitbook/assets/icon-rocket-16.svg" alt=""><br>Rocket</p>                  |
|                  <p><img src="../../.gitbook/assets/icon-rosette-16.svg" alt=""><br>Rosette</p>                   | <p><img src="../../.gitbook/assets/icon-rotate-anti-clockwise-16.svg" alt=""><br>RotateAntiClockwise</p> |        <p><img src="../../.gitbook/assets/icon-rotate-clockwise-16.svg" alt=""><br>RotateClockwise</p>        |
|                    <p><img src="../../.gitbook/assets/icon-ruler-16.svg" alt=""><br>Ruler</p>                     |        <p><img src="../../.gitbook/assets/icon-save-document-16.svg" alt=""><br>SaveDocument</p>         |                <p><img src="../../.gitbook/assets/icon-shield-01-16.svg" alt=""><br>Shield</p>                |
|           <p><img src="../../.gitbook/assets/icon-short-paragraph-16.svg" alt=""><br>ShortParagraph</p>           |              <p><img src="../../.gitbook/assets/icon-shuffle-16.svg" alt=""><br>Shuffle</p>              |        <p><img src="../../.gitbook/assets/icon-app-window-sidebar-right-16.svg" alt=""><br>Sidebar</p>        |
|                  <p><img src="../../.gitbook/assets/icon-signal-1-16.svg" alt=""><br>Signal1</p>                  |             <p><img src="../../.gitbook/assets/icon-signal-2-16.svg" alt=""><br>Signal2</p>              |                <p><img src="../../.gitbook/assets/icon-signal-3-16.svg" alt=""><br>Signal3</p>                |
|                 <p><img src="../../.gitbook/assets/icon-snippets-16.svg" alt=""><br>Snippets</p>                  |            <p><img src="../../.gitbook/assets/icon-snowflake-16.svg" alt=""><br>Snowflake</p>            |             <p><img src="../../.gitbook/assets/icon-soccer-ball-16.svg" alt=""><br>SoccerBall</p>             |
|              <p><img src="../../.gitbook/assets/icon-speaker-down-16.svg" alt=""><br>SpeakerDown</p>              |         <p><img src="../../.gitbook/assets/icon-speaker-high-16.svg" alt=""><br>SpeakerHigh</p>          |             <p><img src="../../.gitbook/assets/icon-speaker-low-16.svg" alt=""><br>SpeakerLow</p>             |
|               <p><img src="../../.gitbook/assets/icon-speaker-off-16.svg" alt=""><br>SpeakerOff</p>               |           <p><img src="../../.gitbook/assets/icon-speaker-on-16.svg" alt=""><br>SpeakerOn</p>            |              <p><img src="../../.gitbook/assets/icon-speaker-up-16.svg" alt=""><br>SpeakerUp</p>              |
|             <p><img src="../../.gitbook/assets/icon-speech-bubble-16.svg" alt=""><br>SpeechBubble</p>             |  <p><img src="../../.gitbook/assets/icon-speech-bubble-active-16.svg" alt=""><br>SpeechBubbleActive</p>  | <p><img src="../../.gitbook/assets/icon-speech-bubble-important-16.svg" alt=""><br>SpeechBubbleImportant</p>  |
|                     <p><img src="../../.gitbook/assets/icon-star-16.svg" alt=""><br>Star</p>                      |          <p><img src="../../.gitbook/assets/icon-star-circle-16.svg" alt=""><br>StarCircle</p>           |           <p><img src="../../.gitbook/assets/icon-star-disabled-16.svg" alt=""><br>StarDisabled</p>           |
|                    <p><img src="../../.gitbook/assets/icon-stars-16.svg" alt=""><br>Stars</p>                     |                 <p><img src="../../.gitbook/assets/icon-stop-16.svg" alt=""><br>Stop</p>                 |             <p><img src="../../.gitbook/assets/icon-stop-filled-16.svg" alt=""><br>StopFilled</p>             |
|                <p><img src="../../.gitbook/assets/icon-stopwatch-16.svg" alt=""><br>Stopwatch</p>                 |                <p><img src="../../.gitbook/assets/icon-store-16.svg" alt=""><br>Store</p>                |          <p><img src="../../.gitbook/assets/icon-strike-through-16.svg" alt=""><br>StrikeThrough</p>          |
|                      <p><img src="../../.gitbook/assets/icon-sun-16.svg" alt=""><br>Sun</p>                       |              <p><img src="../../.gitbook/assets/icon-sunrise-16.svg" alt=""><br>Sunrise</p>              |                 <p><img src="../../.gitbook/assets/icon-swatch-16.svg" alt=""><br>Swatch</p>                  |
|                   <p><img src="../../.gitbook/assets/icon-switch-16.svg" alt=""><br>Switch</p>                    |              <p><img src="../../.gitbook/assets/icon-syringe-16.svg" alt=""><br>Syringe</p>              |                    <p><img src="../../.gitbook/assets/icon-tag-16.svg" alt=""><br>Tag</p>                     |
|              <p><img src="../../.gitbook/assets/icon-temperature-16.svg" alt=""><br>Temperature</p>               |          <p><img src="../../.gitbook/assets/icon-tennis-ball-16.svg" alt=""><br>TennisBall</p>           |               <p><img src="../../.gitbook/assets/icon-terminal-16.svg" alt=""><br>Terminal</p>                |
|                     <p><img src="../../.gitbook/assets/icon-text-16.svg" alt=""><br>Text</p>                      |          <p><img src="../../.gitbook/assets/icon-text-cursor-16.svg" alt=""><br>TextCursor</p>           |              <p><img src="../../.gitbook/assets/icon-text-input-16.svg" alt=""><br>TextInput</p>              |
|                    <p><img src="../../.gitbook/assets/icon-torch-16.svg" alt=""><br>Torch</p>                     |                <p><img src="../../.gitbook/assets/icon-train-16.svg" alt=""><br>Train</p>                |                  <p><img src="../../.gitbook/assets/icon-trash-16.svg" alt=""><br>Trash</p>                   |
|                     <p><img src="../../.gitbook/assets/icon-tray-16.svg" alt=""><br>Tray</p>                      |                 <p><img src="../../.gitbook/assets/icon-tree-16.svg" alt=""><br>Tree</p>                 |                 <p><img src="../../.gitbook/assets/icon-trophy-16.svg" alt=""><br>Trophy</p>                  |
|                <p><img src="../../.gitbook/assets/icon-two-people-16.svg" alt=""><br>TwoPeople</p>                |             <p><img src="../../.gitbook/assets/icon-umbrella-16.svg" alt=""><br>Umbrella</p>             |              <p><img src="../../.gitbook/assets/icon-underline-16.svg" alt=""><br>Underline</p>               |
|                     <p><img src="../../.gitbook/assets/icon-undo-16.svg" alt=""><br>Undo</p>                      |               <p><img src="../../.gitbook/assets/icon-upload-16.svg" alt=""><br>Upload</p>               |              <p><img src="../../.gitbook/assets/icon-uppercase-16.svg" alt=""><br>Uppercase</p>               |
|                    <p><img src="../../.gitbook/assets/icon-video-16.svg" alt=""><br>Video</p>                     |               <p><img src="../../.gitbook/assets/icon-wallet-16.svg" alt=""><br>Wallet</p>               |                   <p><img src="../../.gitbook/assets/icon-wand-16.svg" alt=""><br>Wand</p>                    |
|                  <p><img src="../../.gitbook/assets/icon-warning-16.svg" alt=""><br>Warning</p>                   |              <p><img src="../../.gitbook/assets/icon-weights-16.svg" alt=""><br>Weights</p>              |                   <p><img src="../../.gitbook/assets/icon-wifi-16.svg" alt=""><br>Wifi</p>                    |
|             <p><img src="../../.gitbook/assets/icon-wifi-disabled-16.svg" alt=""><br>WifiDisabled</p>             |             <p><img src="../../.gitbook/assets/icon-app-window-16.svg" alt=""><br>Window</p>             |      <p><img src="../../.gitbook/assets/icon-wrench-screwdriver-16.svg" alt=""><br>WrenchScrewdriver</p>      |
|               <p><img src="../../.gitbook/assets/icon-wrist-watch-16.svg" alt=""><br>WristWatch</p>               |         <p><img src="../../.gitbook/assets/icon-x-mark-circle-16.svg" alt=""><br>XMarkCircle</p>         |     <p><img src="../../.gitbook/assets/icon-x-mark-circle-filled-16.svg" alt=""><br>XMarkCircleFilled</p>     |
|    <p><img src="../../.gitbook/assets/icon-x-mark-top-right-square-16.svg" alt=""><br>XMarkTopRightSquare</p>     |

### Image.Mask

Available masks that can be used to change the shape of an image.

Can be handy to shape avatars or other items in a list.

#### Example

```typescript
import { Image, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Icon"
        icon={{
          source: "https://raycast.com/uploads/avatar.png",
          mask: Image.Mask.Circle,
        }}
      />
    </List>
  );
}
```

#### Enumeration members

| Name             | Value              |
| :--------------- | :----------------- |
| Circle           | "circle"           |
| RoundedRectangle | "roundedRectangle" |

## Types

### Image

Display different types of images, including network images or bundled assets.

Apply image transforms to the source, such as a `mask` or a `tintColor`.

{% hint style="info" %}
Tip: Suffix your local assets with `@dark` to automatically provide a dark theme option, eg: `icon.png` and `icon@dark.png`.
{% endhint %}

#### Example

```typescript
// Built-in icon
const icon = Icon.Eye;

// Built-in icon with tint color
const tintedIcon = { source: Icon.Bubble, tintColor: Color.Red };

// Bundled asset with circular mask
const avatar = { source: "avatar.png", mask: ImageMask.Circle };

// Implicit theme-aware icon
// with 'icon.png' and 'icon@dark.png' in the `assets` folder
const icon = "icon.png";

// Explicit theme-aware icon
const icon = { source: { light: "https://example.com/icon-light.png", dark: "https://example.com/icon-dark.png" } };
```

#### Properties

| Property | Description | Type |
| :--- | :--- | :--- |
| source<mark style="color:red;">*</mark> | The [Image.Source](icons-and-images.md#image.source) of the image. | <code>[Image.Source](icons-and-images.md#image.source)</code> |
| fallback | [Image.Fallback](icons-and-images.md#image.fallback) image, in case `source` can't be loaded. | <code>[Image.Fallback](icons-and-images.md#image.fallback)</code> |
| mask | A [Image.Mask](icons-and-images.md#image.mask) to apply to the image. | <code>[Image.Mask](icons-and-images.md#image.mask)</code> |
| tintColor | A [Color.ColorLike](colors.md#color.colorlike) to tint all the non-transparent pixels of the image. | <code>[Color.ColorLike](colors.md#color.colorlike)</code> |

### FileIcon

An icon as it's used in the Finder.

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="File icon" icon={{ fileIcon: __filename }} />
    </List>
  );
}
```

#### Properties

| Property | Description | Type |
| :--- | :--- | :--- |
| fileIcon<mark style="color:red;">*</mark> | The path to a file or folder to get its icon from. | <code>string</code> |

### Image.ImageLike

```typescript
ImageLike: URL | Asset | Icon | FileIcon | Image;
```

Union type for the supported image types.

#### Example

```typescript
import { Icon, Image, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="URL" icon="https://raycast.com/uploads/avatar.png" />
      <List.Item title="Asset" icon="avatar.png" />
      <List.Item title="Icon" icon={Icon.Circle} />
      <List.Item title="FileIcon" icon={{ fileIcon: __filename }} />
      <List.Item
        title="Image"
        icon={{
          source: "https://raycast.com/uploads/avatar.png",
          mask: Image.Mask.Circle,
        }}
      />
    </List>
  );
}
```

### Image.Source

```typescript
Image.Source: URL | Asset | Icon | { light: URL | Asset; dark: URL | Asset }
```

The source of an [Image](#image). Can be either a remote URL, a local file resource, a built-in [Icon](#icon) or
a single emoji.

For consistency, it's best to use the built-in [Icon](#icon) in lists, the Action Panel, and other places. If a
specific icon isn't built-in, you can reference custom ones from the `assets` folder of the extension by file name,
e.g. `my-icon.png`. Alternatively, you can reference an absolute HTTPS URL that points to an image or use an emoji.
You can also specify different remote or local assets for light and dark theme.

#### Example

```typescript
import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="URL" icon={{ source: "https://raycast.com/uploads/avatar.png" }} />
      <List.Item title="Asset" icon={{ source: "avatar.png" }} />
      <List.Item title="Icon" icon={{ source: Icon.Circle }} />
      <List.Item
        title="Theme"
        icon={{
          source: {
            light: "https://raycast.com/uploads/avatar.png",
            dark: "https://raycast.com/uploads/avatar.png",
          },
        }}
      />
    </List>
  );
}
```

### Image.Fallback

```typescript
Image.Fallback: Asset | Icon | { light: Asset; dark: Asset }
```

A fallback [Image](#image) that will be displayed in case the source image cannot be loaded. Can be either a local file resource, a built-in [Icon](#icon), a single emoji, or a theme-aware asset. Any specified `mask` or `tintColor` will also apply to the fallback image.

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="URL Source With Asset Fallback"
        icon={{
          source: "https://raycast.com/uploads/avatar.png",
          fallback: "default-avatar.png",
        }}
      />
    </List>
  );
}
```

### Image.URL

Image is a string representing a URL.

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="URL" icon={{ source: "https://raycast.com/uploads/avatar.png" }} />
    </List>
  );
}
```

### Image.Asset

Image is a string representing an asset from the `assets/` folder

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="Asset" icon={{ source: "avatar.png" }} />
    </List>
  );
}
```
