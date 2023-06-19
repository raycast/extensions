import Quartz


// https://opensource.apple.com/source/IOHIDFamily/IOHIDFamily-34.12/IOHIDSystem/IOKit/hidsystem/ev_keymap.h.auto.html
let dict = [
  "sound_up": NX_KEYTYPE_SOUND_UP,
  "sound_down": NX_KEYTYPE_SOUND_DOWN,
  "play": NX_KEYTYPE_PLAY,
  "next": NX_KEYTYPE_NEXT,
  "previous": NX_KEYTYPE_PREVIOUS,
  "fast": NX_KEYTYPE_FAST,
  "rewind": NX_KEYTYPE_REWIND,
]

// help from https://stackoverflow.com/a/55854051
func HIDPostAuxKey(key: Int32) {
            func doKey(down: Bool) {
                let flags = NSEvent.ModifierFlags(rawValue: (down ? 0xa00 : 0xb00))
                let data1 = Int((key<<16) | (down ? 0xa00 : 0xb00))

                let ev = NSEvent.otherEvent(with: NSEvent.EventType.systemDefined,
                                            location: NSPoint(x:0,y:0),
                                            modifierFlags: flags,
                                            timestamp: 0,
                                            windowNumber: 0,
                                            context: nil,
                                            subtype: 8,
                                            data1: data1,
                                            data2: -1
                                            )
                let cev = ev?.cgEvent
                cev?.post(tap: CGEventTapLocation.cghidEventTap)
            }
            doKey(down: true)
            doKey(down: false)
        }

let args = CommandLine.arguments
let keyType = args[args.count - 1]
if let raw = dict[keyType]{
    HIDPostAuxKey(key:raw)
}else{
    exit(1)
}
