```fortran
subroutine claein (
        logical rightv,
        logical noinit,
        integer n,
        complex, dimension( ldh, * ) h,
        integer ldh,
        complex w,
        complex, dimension( * ) v,
        complex, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( * ) rwork,
        real eps3,
        real smlnum,
        integer info
)
```

CLAEIN uses inverse iteration to find a right or left eigenvector
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

H : COMPLEX array, dimension (LDH,N) [in]
> The upper Hessenberg matrix H.

LDH : INTEGER [in]
> The leading dimension of the array H.  LDH >= max(1,N).

W : COMPLEX [in]
> The eigenvalue of H whose corresponding right or left
> eigenvector is to be computed.

V : COMPLEX array, dimension (N) [in,out]
> On entry, if NOINIT = .FALSE., V must contain a starting
> vector for inverse iteration; otherwise V need not be set.
> On exit, V contains the computed eigenvector, normalized so
> that the component of largest magnitude has magnitude 1; here
> the magnitude of a complex number (x,y) is taken to be
> |x| + |y|.

B : COMPLEX array, dimension (LDB,N) [out]

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

RWORK : REAL array, dimension (N) [out]

EPS3 : REAL [in]
> A small machine-dependent value which is used to perturb
> close eigenvalues, and to replace zero pivots.

SMLNUM : REAL [in]
> A machine-dependent value close to the underflow threshold.

INFO : INTEGER [out]
> = 0:  successful exit
> = 1:  inverse iteration did not converge; V is set to the
> last iterate.
