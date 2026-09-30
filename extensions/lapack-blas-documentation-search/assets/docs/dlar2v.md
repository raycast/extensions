```fortran
subroutine dlar2v (
        integer n,
        double precision, dimension( * ) x,
        double precision, dimension( * ) y,
        double precision, dimension( * ) z,
        integer incx,
        double precision, dimension( * ) c,
        double precision, dimension( * ) s,
        integer incc
)
```

DLAR2V applies a vector of real plane rotations from both sides to
a sequence of 2-by-2 real symmetric matrices, defined by the elements
of the vectors x, y and z. For i = 1,2,...,n

( x(i)  z(i) ) := (  c(i)  s(i) ) ( x(i)  z(i) ) ( c(i) -s(i) )
( z(i)  y(i) )    ( -s(i)  c(i) ) ( z(i)  y(i) ) ( s(i)  c(i) )

## Parameters
N : INTEGER [in]
> The number of plane rotations to be applied.

X : DOUBLE PRECISION array, [in,out]
> dimension (1+(N-1)\*INCX)
> The vector x.

Y : DOUBLE PRECISION array, [in,out]
> dimension (1+(N-1)\*INCX)
> The vector y.

Z : DOUBLE PRECISION array, [in,out]
> dimension (1+(N-1)\*INCX)
> The vector z.

INCX : INTEGER [in]
> The increment between elements of X, Y and Z. INCX > 0.

C : DOUBLE PRECISION array, dimension (1+(N-1)\*INCC) [in]
> The cosines of the plane rotations.

S : DOUBLE PRECISION array, dimension (1+(N-1)\*INCC) [in]
> The sines of the plane rotations.

INCC : INTEGER [in]
> The increment between elements of C and S. INCC > 0.
