```fortran
real function scasum (
        integer n,
        complex, dimension(*) cx,
        integer incx
)
```

SCASUM takes the sum of the (|Re(.)| + |Im(.)|)'s of a complex vector and
returns a single precision result.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

CX : COMPLEX array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in,out]

INCX : INTEGER [in]
> storage spacing between elements of SX
