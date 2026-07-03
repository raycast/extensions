/*
Copyright © 2026 SOM38 spe4pg@gmail.com
*/
package cmd

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/spf13/cobra"
)

func receiver(listener net.Listener, items []string) {
	for {
		conn, err := listener.Accept()
		if err != nil {
			errCh <- err
			return
		}
		fmt.Fprintf(conn, "%v\n", len(items))
		fmt.Fprint(conn, strings.Join(items, "\n")+"\n")
		fmt.Fprintln(os.Stderr, "Acquired another connection...")
		connCh <- conn
	}
}

func reader(conn net.Conn) {
	choice, err := bufio.NewReader(conn).ReadString('\n')
	if err != nil {
		errCh <- errors.New("Nothing was chosen")
		return
	}
	selection <- choice
}

var (
	connCh    = make(chan net.Conn)
	errCh     = make(chan error)
	selection = make(chan string)

	rootCmd = &cobra.Command{
		Use:   "choose",
		Short: "Choose items from stdin via raycast",
		Long: `Takes input from stdin, separates into items by \n and feeds to raycast. Choice is then piped to stdout:

For now its just that, no extra flags or anything`,
		RunE: func(cmd *cobra.Command, args []string) error {
			listener, err := net.Listen("tcp", "127.0.0.1:0")
			if err != nil {
				return err
			}
			addr := listener.Addr().String()
			fmt.Fprintf(os.Stderr, "Will be listening on %v...\n", addr)
			defer listener.Close()

			stdin, err := io.ReadAll(cmd.InOrStdin())
			if err != nil {
				return err
			}
			if len(stdin) <= 1 {
				return errors.New("Got empty stdin!")
			}

			host, port, _ := net.SplitHostPort(addr)
			deepLinkURL := fmt.Sprintf(
				`raycast://extensions/anaritus/choose/choose?arguments={"host": "%s","port": "%s"}`, host, port,
			)
			fmt.Fprintf(os.Stderr, "Opening %v...\n", deepLinkURL)
			err = exec.Command("open", deepLinkURL).Run()
			if err != nil {
				return err
			}

			items := strings.Split(string(stdin), "\n")

			go receiver(listener, items)

			select {
			case err = <-errCh:
				return err
			case conn := <-connCh:
				go reader(conn)
			}

			for {
				select {
				case err = <-errCh:
					timer := time.NewTimer(50 * time.Millisecond)
					select {
					case conn := <-connCh:
						timer.Stop()
						go reader(conn)
					case <-timer.C:
						return errors.New("Failed to refresh connection after breaking")
					}
				case choice := <-selection:
					fmt.Println(strings.TrimRight(choice, " \n"))
					return nil
				}
			}
		},
	}
)

func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func init() {
}
