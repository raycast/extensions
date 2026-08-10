```fortran
double precision function dasum (
        integer n,
        double precision, dimension(*) dx,
        integer incx
)
```

DASUM takes the sum of the absolute values.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

DX : DOUBLE PRECISION array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in]

INCX : INTEGER [in]
> storage spacing between elements of DX
