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

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
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
		fmt.Fprintf(os.Stderr, "Will be listening on %v...", addr)
		defer listener.Close()

		stdin, err := io.ReadAll(cmd.InOrStdin())
		if err != nil {
			return err
		}
		if len(stdin) <= 1 {
			return errors.New("Got empty stdin!")
		}

		host, port, _ := net.SplitHostPort(addr)
		deepLinkURL := fmt.Sprintf(`raycast://extensions/anaritus/choose/choose?arguments={"host": "%s","port": "%s"}`, host, port)
		fmt.Fprintf(os.Stderr, "Opening %v...", deepLinkURL)
		err = exec.Command("open", deepLinkURL).Run()
		if err != nil {
			return err
		}

		items := strings.Split(string(stdin), "\n")

		connCh := make(chan net.Conn)
		errCh := make(chan error)

		go func() {
			for {
				conn, err := listener.Accept()
				if err != nil {
					errCh <- err
					return
				}
				connCh <- conn
			}
		}()

		selection := make(chan string)
		reader := func(conn net.Conn) {
			choice, err := bufio.NewReader(conn).ReadString('\n')
			if err != nil {
				errCh <- errors.New("Nothing was chosen")
				return
			}
			selection <- choice
		}

		select {
		case err = <-errCh:
			return err
		case conn := <-connCh:
			fmt.Fprintln(os.Stderr, "Accepted connection")
			fmt.Fprintf(conn, "%v\n", len(items))
			fmt.Fprint(conn, strings.Join(items, "\n")+"\n")
			go reader(conn)
		}

		for {
			select {
			case err = <-errCh:
				grace := make(chan int)
				go func() {
					time.Sleep(50 * time.Millisecond)
					grace <- 0
				}()
				select {
				case conn := <-connCh:
					go reader(conn)
				case <-grace:
					return errors.New("Failed to refresh connection after breaking")
				}
			case choice := <-selection:
				fmt.Println(strings.TrimRight(choice, " \n"))
				return nil
			}
		}
	},
}

func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func init() {
}
