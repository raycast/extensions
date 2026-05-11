```fortran
subroutine dlaqr2 (
        logical wantt,
        logical wantz,
        integer n,
        integer ktop,
        integer kbot,
        integer nw,
        double precision, dimension( ldh, * ) h,
        integer ldh,
        integer iloz,
        integer ihiz,
        double precision, dimension( ldz, * ) z,
        integer ldz,
        integer ns,
        integer nd,
        double precision, dimension( * ) sr,
        double precision, dimension( * ) si,
        double precision, dimension( ldv, * ) v,
        integer ldv,
        integer nh,
        double precision, dimension( ldt, * ) t,
        integer ldt,
        integer nv,
        double precision, dimension( ldwv, * ) wv,
        integer ldwv,
        double precision, dimension( * ) work,
        integer lwork
)
```

DLAQR2 is identical to DLAQR3 except that it avoids
recursion by calling DLAHQR instead of DLAQR4.

Aggressive early deflation:

This subroutine accepts as input an upper Hessenberg matrix
H and performs an orthogonal similarity transformation
designed to detect and deflate fully converged eigenvalues from
a trailing principal submatrix.  On output H has been over-
written by a new Hessenberg matrix that is a perturbation of
an orthogonal similarity transformation of H.  It is to be
hoped that the final version of H has many zero subdiagonal
entries.

## Parameters
WANTT : LOGICAL [in]
> If .TRUE., then the Hessenberg matrix H is fully updated
> so that the quasi-triangular Schur factor may be
> computed (in cooperation with the calling subroutine).
> If .FALSE., then only enough of H is updated to preserve
> the eigenvalues.

WANTZ : LOGICAL [in]
> If .TRUE., then the orthogonal matrix Z is updated so
> so that the orthogonal Schur factor may be computed
> (in cooperation with the calling subroutine).
> If .FALSE., then Z is not referenced.

N : INTEGER [in]
> The order of the matrix H and (if WANTZ is .TRUE.) the
> order of the orthogonal matrix Z.

KTOP : INTEGER [in]
> It is assumed that either KTOP = 1 or H(KTOP,KTOP-1)=0.
> KBOT and KTOP together determine an isolated block
> along the diagonal of the Hessenberg matrix.

KBOT : INTEGER [in]
> It is assumed without a check that either
> KBOT = N or H(KBOT+1,KBOT)=0.  KBOT and KTOP together
> determine an isolated block along the diagonal of the
> Hessenberg matrix.

NW : INTEGER [in]
> Deflation window size.  1 <= NW <= (KBOT-KTOP+1).

H : DOUBLE PRECISION array, dimension (LDH,N) [in,out]
> On input the initial N-by-N section of H stores the
> Hessenberg matrix undergoing aggressive early deflation.
> On output H has been transformed by an orthogonal
> similarity transformation, perturbed, and the returned
> to Hessenberg form that (it is to be hoped) has some
> zero subdiagonal entries.

LDH : INTEGER [in]
> Leading dimension of H just as declared in the calling
> subroutine.  N <= LDH

ILOZ : INTEGER [in]

IHIZ : INTEGER [in]
> Specify the rows of Z to which transformations must be
> applied if WANTZ is .TRUE.. 1 <= ILOZ <= IHIZ <= N.

Z : DOUBLE PRECISION array, dimension (LDZ,N) [in,out]
> IF WANTZ is .TRUE., then on output, the orthogonal
> similarity transformation mentioned above has been
> accumulated into Z(ILOZ:IHIZ,ILOZ:IHIZ) from the right.
> If WANTZ is .FALSE., then Z is unreferenced.

LDZ : INTEGER [in]
> The leading dimension of Z just as declared in the
> calling subroutine.  1 <= LDZ.

NS : INTEGER [out]
> The number of unconverged (ie approximate) eigenvalues
> returned in SR and SI that may be used as shifts by the
> calling subroutine.

ND : INTEGER [out]
> The number of converged eigenvalues uncovered by this
> subroutine.

SR : DOUBLE PRECISION array, dimension (KBOT) [out]

SI : DOUBLE PRECISION array, dimension (KBOT) [out]
> On output, the real and imaginary parts of approximate
> eigenvalues that may be used for shifts are stored in
> SR(KBOT-ND-NS+1) through SR(KBOT-ND) and
> SI(KBOT-ND-NS+1) through SI(KBOT-ND), respectively.
> The real and imaginary parts of converged eigenvalues
> are stored in SR(KBOT-ND+1) through SR(KBOT) and
> SI(KBOT-ND+1) through SI(KBOT), respectively.

V : DOUBLE PRECISION array, dimension (LDV,NW) [out]
> An NW-by-NW work array.

LDV : INTEGER [in]
> The leading dimension of V just as declared in the
> calling subroutine.  NW <= LDV

NH : INTEGER [in]
> The number of columns of T.  NH >= NW.

T : DOUBLE PRECISION array, dimension (LDT,NW) [out]

LDT : INTEGER [in]
> The leading dimension of T just as declared in the
> calling subroutine.  NW <= LDT

NV : INTEGER [in]
> The number of rows of work array WV available for
> workspace.  NV >= NW.

WV : DOUBLE PRECISION array, dimension (LDWV,NW) [out]

LDWV : INTEGER [in]
> The leading dimension of W just as declared in the
> calling subroutine.  NW <= LDV

WORK : DOUBLE PRECISION array, dimension (LWORK) [out]
> On exit, WORK(1) is set to an estimate of the optimal value
> of LWORK for the given values of N, NW, KTOP and KBOT.

LWORK : INTEGER [in]
> The dimension of the work array WORK.  LWORK = 2\*NW
> suffices, but greater efficiency may result from larger
> values of LWORK.
> 
> If LWORK = -1, then a workspace query is assumed; DLAQR2
> only estimates the optimal workspace size for the given
> values of N, NW, KTOP and KBOT.  The estimate is returned
> in WORK(1).  No error message related to LWORK is issued
> by XERBLA.  Neither H nor Z are accessed.
