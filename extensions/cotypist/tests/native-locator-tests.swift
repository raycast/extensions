import Foundation

@main struct LocatorTests {
    static func main() throws {
        let label = "Enable completions by default"
        let nodes = [
            ControlNode(id: 0, role: "AXScrollArea", labels: [], parent: nil, children: [1, 2, 3, 4]),
            ControlNode(id: 1, role: "AXStaticText", labels: ["Model files. Completion Settings " + label], parent: 0, children: []),
            ControlNode(id: 2, role: "AXCheckBox", labels: [], parent: 0, children: []),
            ControlNode(id: 3, role: "AXStaticText", labels: ["Complete inside existing text"], parent: 0, children: []),
            ControlNode(id: 4, role: "AXCheckBox", labels: [], parent: 0, children: [])
        ]
        let target = try locateDefaultControl(nodes, label: label)
        precondition(target == 2, "The default control must bind structurally before reading its value")
        var pressed: [Int] = []
        var acknowledged = false
        let unreadableIntendedWithReadableNeighbor: [Int: Bool] = [4: false]
        do {
            let id = try locateDefaultControl(nodes, label: label)
            _ = try requireBoolean(unreadableIntendedWithReadableNeighbor[id])
            pressed.append(id)
            acknowledged = true
        } catch {}
        precondition(pressed.isEmpty, "Unreadable intended state must not press the neighboring control")
        precondition(!acknowledged, "Unreadable intended state must not produce a status acknowledgement")
        let readable: [Int: Bool] = [2: true, 4: false]
        let readableValue = try requireBoolean(readable[target]); precondition(readableValue == true)
        let missingIntended = [nodes[0], nodes[1], ControlNode(id: 2, role: "AXStaticText", labels: ["Unrecognized control"], parent: 0, children: []), nodes[3], nodes[4]]
        do { _ = try locateDefaultControl(missingIntended, label: label); preconditionFailure("Never skip an unrecognized immediate sibling to a later toggle") } catch {}
        let duplicate = nodes + [ControlNode(id: 5, role: "AXStaticText", labels: [label], parent: nil, children: [])]
        do { _ = try locateDefaultControl(duplicate, label: label); preconditionFailure("Duplicate labels must fail safely") } catch {}
        let named = [ControlNode(id: 0, role: "AXCheckBox", labels: [label], parent: nil, children: [1]), ControlNode(id: 1, role: "AXStaticText", labels: [label], parent: 0, children: [])]
        let namedTarget = try locateDefaultControl(named, label: label); precondition(namedTarget == 0)
        let wrapped = [ControlNode(id: 0, role: "AXScrollArea", labels: [], parent: nil, children: [1, 2]), ControlNode(id: 1, role: "AXStaticText", labels: [label], parent: 0, children: []), ControlNode(id: 2, role: "AXGroup", labels: [], parent: 0, children: [3]), ControlNode(id: 3, role: "AXSwitch", labels: [], parent: 2, children: [])]
        let wrappedTarget = try locateDefaultControl(wrapped, label: label); precondition(wrappedTarget == 3)
        let ambiguous = [wrapped[0], wrapped[1], ControlNode(id: 2, role: "AXGroup", labels: [], parent: 0, children: [3, 4]), wrapped[3], ControlNode(id: 4, role: "AXSwitch", labels: [], parent: 2, children: [])]
        do { _ = try locateDefaultControl(ambiguous, label: label); preconditionFailure("A multi-control wrapper cannot establish association") } catch {}
        print("Native locator regressions passed: unreadable intended switch, no neighbor press, no false acknowledgement, missing control, duplicate label, direct named control, transparent wrapper, ambiguous wrapper.")
    }
}
