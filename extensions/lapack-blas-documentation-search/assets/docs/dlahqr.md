```fortran
subroutine dlahqr (
        logical wantt,
        logical wantz,
        integer n,
        integer ilo,
        integer ihi,
        double precision, dimension( ldh, * ) h,
        integer ldh,
        double precision, dimension( * ) wr,
        double precision, dimension( * ) wi,
        integer iloz,
        integer ihiz,
        double precision, dimension( ldz, * ) z,
        integer ldz,
        integer info
)
```

DLAHQR is an auxiliary routine called by DHSEQR to update the
eigenvalues and Schur decomposition already computed by DHSEQR, by
dealing with the Hessenberg submatrix in rows and columns ILO to
IHI.

## Parameters
WANTT : LOGICAL [in]
> = .TRUE. : the full Schur form T is required;
> = .FALSE.: only eigenvalues are required.

WANTZ : LOGICAL [in]
> = .TRUE. : the matrix of Schur vectors Z is required;
> = .FALSE.: Schur vectors are not required.

N : INTEGER [in]
> The order of the matrix H.  N >= 0.

ILO : INTEGER [in]

IHI : INTEGER [in]
> It is assumed that H is already upper quasi-triangular in
> rows and columns IHI+1:N, and that H(ILO,ILO-1) = 0 (unless
> ILO = 1). DLAHQR works primarily with the Hessenberg
> submatrix in rows and columns ILO to IHI, but applies
> transformations to all of H if WANTT is .TRUE..
> 1 <= ILO <= max(1,IHI); IHI <= N.

H : DOUBLE PRECISION array, dimension (LDH,N) [in,out]
> On entry, the upper Hessenberg matrix H.
> On exit, if INFO is zero and if WANTT is .TRUE., H is upper
> quasi-triangular in rows and columns ILO:IHI, with any
> 2-by-2 diagonal blocks in standard form. If INFO is zero
> and WANTT is .FALSE., the contents of H are unspecified on
> exit.  The output state of H if INFO is nonzero is given
> below under the description of INFO.

LDH : INTEGER [in]
> The leading dimension of the array H. LDH >= max(1,N).

WR : DOUBLE PRECISION array, dimension (N) [out]

WI : DOUBLE PRECISION array, dimension (N) [out]
> The real and imaginary parts, respectively, of the computed
> eigenvalues ILO to IHI are stored in the corresponding
> elements of WR and WI. If two eigenvalues are computed as a
> complex conjugate pair, they are stored in consecutive
> elements of WR and WI, say the i-th and (i+1)th, with
> WI(i) > 0 and WI(i+1) < 0. If WANTT is .TRUE., the
> eigenvalues are stored in the same order as on the diagonal
> of the Schur form returned in H, with WR(i) = H(i,i), and, if
> H(i:i+1,i:i+1) is a 2-by-2 diagonal block,
> WI(i) = sqrt(H(i+1,i)\*H(i,i+1)) and WI(i+1) = -WI(i).

ILOZ : INTEGER [in]

IHIZ : INTEGER [in]
> Specify the rows of Z to which transformations must be
> applied if WANTZ is .TRUE..
> 1 <= ILOZ <= ILO; IHI <= IHIZ <= N.

Z : DOUBLE PRECISION array, dimension (LDZ,N) [in,out]
> If WANTZ is .TRUE., on entry Z must contain the current
> matrix Z of transformations accumulated by DHSEQR, and on
> exit Z has been updated; transformations are applied only to
> the submatrix Z(ILOZ:IHIZ,ILO:IHI).
> If WANTZ is .FALSE., Z is not referenced.

LDZ : INTEGER [in]
> The leading dimension of the array Z. LDZ >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> > 0:  If INFO = i, DLAHQR failed to compute all the
> eigenvalues ILO to IHI in a total of 30 iterations
> per eigenvalue; elements i+1:ihi of WR and WI
> contain those eigenvalues which have been
> successfully computed.
> 
> If INFO > 0 and WANTT is .FALSE., then on exit,
> the remaining unconverged eigenvalues are the
> eigenvalues of the upper Hessenberg matrix rows
> and columns ILO through INFO of the final, output
> value of H.
> 
> If INFO > 0 and WANTT is .TRUE., then on exit
> (\*)       (initial value of H)\*U  = U\*(final value of H)
> where U is an orthogonal matrix.    The final
> value of H is upper Hessenberg and triangular in
> rows and columns INFO+1 through IHI.
> 
> If INFO > 0 and WANTZ is .TRUE., then on exit
> (final value of Z)  = (initial value of Z)\*U
> where U is the orthogonal matrix in (\*)
> (regardless of the value of WANTT.)
