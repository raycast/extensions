```fortran
subroutine dlaein (
        logical rightv,
        logical noinit,
        integer n,
        double precision, dimension( ldh, * ) h,
        integer ldh,
        double precision wr,
        double precision wi,
        double precision, dimension( * ) vr,
        double precision, dimension( * ) vi,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        double precision, dimension( * ) work,
        double precision eps3,
        double precision smlnum,
        double precision bignum,
        integer info
)
```

DLAEIN uses inverse iteration to find a right or left eigenvector
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

H : DOUBLE PRECISION array, dimension (LDH,N) [in]
> The upper Hessenberg matrix H.

LDH : INTEGER [in]
> The leading dimension of the array H.  LDH >= max(1,N).

WR : DOUBLE PRECISION [in]

WI : DOUBLE PRECISION [in]
> The real and imaginary parts of the eigenvalue of H whose
> corresponding right or left eigenvector is to be computed.

VR : DOUBLE PRECISION array, dimension (N) [in,out]

VI : DOUBLE PRECISION array, dimension (N) [in,out]
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

B : DOUBLE PRECISION array, dimension (LDB,N) [out]

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= N+1.

WORK : DOUBLE PRECISION array, dimension (N) [out]

EPS3 : DOUBLE PRECISION [in]
> A small machine-dependent value which is used to perturb
> close eigenvalues, and to replace zero pivots.

SMLNUM : DOUBLE PRECISION [in]
> A machine-dependent value close to the underflow threshold.

BIGNUM : DOUBLE PRECISION [in]
> A machine-dependent value close to the overflow threshold.

INFO : INTEGER [out]
> = 0:  successful exit
> = 1:  inverse iteration did not converge; VR is set to the
> last iterate, and so is VI if WI.ne.0.0.
