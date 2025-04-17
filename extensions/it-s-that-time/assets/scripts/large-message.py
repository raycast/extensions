import sys
import pyautogui
from PyQt5.QtWidgets import QApplication, QLabel, QMainWindow, QVBoxLayout, QWidget, QSizePolicy
from PyQt5.QtCore import Qt
from screeninfo import get_monitors

try:
    message = sys.argv[1]
except IndexError:
    print("Error: Please provide a message as an argument")
    sys.exit(1)

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        self.window_width, self.window_height = 1280, 960
        self.setWindowTitle("It's That Time")
        self.resize(self.window_width, self.window_height)

        main_label = QLabel(message, self)
        main_label.setAlignment(Qt.AlignCenter)
        main_label.setStyleSheet("font-size: 144pt;")

        main_label.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        main_label.setWordWrap(True)

        layout = QVBoxLayout()
        layout.addWidget(main_label)

        self.statusBar().showMessage("Press any key to close")

        central_widget = QWidget()
        central_widget.setLayout(layout)
        self.setCentralWidget(central_widget)

        self.center_window_on_mouse()

    def center_window_on_mouse(self):
        mouse_x, mouse_y = pyautogui.position()

        try:
            monitors = get_monitors()
        except Exception as e:
            print(f"Error getting monitor info: {e}")
            sys.exit(1)

        found = false
        for monitor in monitors:
            if monitor.x <= mouse_x <= monitor.x + monitor.width and monitor.y <= mouse_y <= monitor.y + monitor.height:
                found = true
                screen_width = monitor.width
                screen_height = monitor.height
                screen_x = monitor.x
                screen_y = monitor.y
                break
        
        if !found:
            print(f"Error: Not Found Activee Monitor")
            sys.exit(1)

        window_x = screen_x + (screen_width // 2) - (self.window_width // 2)
        window_y = screen_y + (screen_height // 2) - (self.window_height // 2)
        self.move(window_x, window_y)

    def keyPressEvent(self, event):
        self.close()

app = QApplication(sys.argv)
window = MainWindow()
window.show()
sys.exit(app.exec_())
