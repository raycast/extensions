```fortran
subroutine drot (
        integer n,
        double precision, dimension(*) dx,
        integer incx,
        double precision, dimension(*) dy,
        integer incy,
        double precision c,
        double precision s
)
```

DROT applies a plane rotation.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

DX : DOUBLE PRECISION array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in,out]

INCX : INTEGER [in]
> storage spacing between elements of DX

DY : DOUBLE PRECISION array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [in,out]

INCY : INTEGER [in]
> storage spacing between elements of DY

C : DOUBLE PRECISION [in]

S : DOUBLE PRECISION [in]
