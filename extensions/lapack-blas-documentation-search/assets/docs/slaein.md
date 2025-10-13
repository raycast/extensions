```fortran
subroutine slaein (
        logical rightv,
        logical noinit,
        integer n,
        real, dimension( ldh, * ) h,
        integer ldh,
        real wr,
        real wi,
        real, dimension( * ) vr,
        real, dimension( * ) vi,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( * ) work,
        real eps3,
        real smlnum,
        real bignum,
        integer info
)
```

SLAEIN uses inverse iteration to find a right or left eigenvector
corresponding to the eigenvalue (WR,WI) of a real upper Hessenberg
matrix H.

## Parameters
RIGHTV : LOGICAL [in]
> = .TRUE. : compute right eigenvector;
> = .FALSE.: compute left eigenvector.

NOINIT : LOGICAL [in]
> = .TRUE. : no initial vector supplied in (VR,VI).
> = .FALSE.: initial vector supplied in (VR,VI).

N : INTEGER [in]
> The order of the matrix H.  N >= 0.

H : REAL array, dimension (LDH,N) [in]
> The upper Hessenberg matrix H.

LDH : INTEGER [in]
> The leading dimension of the array H.  LDH >= max(1,N).

WR : REAL [in]

WI : REAL [in]
> The real and imaginary parts of the eigenvalue of H whose
> corresponding right or left eigenvector is to be computed.

VR : REAL array, dimension (N) [in,out]

VI : REAL array, dimension (N) [in,out]
> On entry, if NOINIT = .FALSE. and WI = 0.0, VR must contain
> a real starting vector for inverse iteration using the real
> eigenvalue WR; if NOINIT = .FALSE. and WI.ne.0.0, VR and VI
> must contain the real and imaginary parts of a complex
> starting vector for inverse iteration using the complex
> eigenvalue (WR,WI); otherwise VR and VI need not be set.
> On exit, if WI = 0.0 (real eigenvalue), VR contains the
> computed real eigenvector; if WI.ne.0.0 (complex eigenvalue),
> VR and VI contain the real and imaginary parts of the
> computed complex eigenvector. The eigenvector is normalized
> so that the component of largest magnitude has magnitude 1;
> here the magnitude of a complex number (x,y) is taken to be
> |x| + |y|.
> VI is not referenced if WI = 0.0.

B : REAL array, dimension (LDB,N) [out]

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= N+1.

WORK : REAL array, dimension (N) [out]

EPS3 : REAL [in]
> A small machine-dependent value which is used to perturb
> close eigenvalues, and to replace zero pivots.

SMLNUM : REAL [in]
> A machine-dependent value close to the underflow threshold.

BIGNUM : REAL [in]
> A machine-dependent value close to the overflow threshold.

INFO : INTEGER [out]
> = 0:  successful exit
> = 1:  inverse iteration did not converge; VR is set to the
> last iterate, and so is VI if WI.ne.0.0.
