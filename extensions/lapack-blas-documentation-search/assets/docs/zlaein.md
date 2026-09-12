```fortran
subroutine zlaein (
        logical rightv,
        logical noinit,
        integer n,
        complex*16, dimension( ldh, * ) h,
        integer ldh,
        complex*16 w,
        complex*16, dimension( * ) v,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        double precision, dimension( * ) rwork,
        double precision eps3,
        double precision smlnum,
        integer info
)
```

ZLAEIN uses inverse iteration to find a right or left eigenvector
corresponding to the eigenvalue W of a complex upper Hessenberg
matrix H.

## Parameters
RIGHTV : LOGICAL [in]
> = .TRUE. : compute right eigenvector;
> = .FALSE.: compute left eigenvector.

NOINIT : LOGICAL [in]
> = .TRUE. : no initial vector supplied in V
> = .FALSE.: initial vector supplied in V.

N : INTEGER [in]
> The order of the matrix H.  N >= 0.

H : COMPLEX\*16 array, dimension (LDH,N) [in]
> The upper Hessenberg matrix H.

LDH : INTEGER [in]
> The leading dimension of the array H.  LDH >= max(1,N).

W : COMPLEX\*16 [in]
> The eigenvalue of H whose corresponding right or left
> eigenvector is to be computed.

V : COMPLEX\*16 array, dimension (N) [in,out]
> On entry, if NOINIT = .FALSE., V must contain a starting
> vector for inverse iteration; otherwise V need not be set.
> On exit, V contains the computed eigenvector, normalized so
> that the component of largest magnitude has magnitude 1; here
> the magnitude of a complex number (x,y) is taken to be
> |x| + |y|.

B : COMPLEX\*16 array, dimension (LDB,N) [out]

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

RWORK : DOUBLE PRECISION array, dimension (N) [out]

EPS3 : DOUBLE PRECISION [in]
> A small machine-dependent value which is used to perturb
> close eigenvalues, and to replace zero pivots.

SMLNUM : DOUBLE PRECISION [in]
> A machine-dependent value close to the underflow threshold.

INFO : INTEGER [out]
> = 0:  successful exit
> = 1:  inverse iteration did not converge; V is set to the
> last iterate.
